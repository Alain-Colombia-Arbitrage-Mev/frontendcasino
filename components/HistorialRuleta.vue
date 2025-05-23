<template>
  <div class="bg-white p-4 rounded-lg shadow-md h-full">
    <h2 class="text-xl font-bold mb-4 text-gray-800">Historial de la Ruleta</h2>
    
    <!-- Formulario para añadir nuevos números -->
    <form @submit.prevent="processNewNumbers" class="mb-6">
      <div class="flex gap-2">
        <input
          v-model="numbersInput"
          type="text"
          placeholder="Ingresa números separados por coma (ej: 5,12,31,0)"
          class="flex-1 border rounded px-3 py-2"
        />
        <button 
          type="submit"
          class="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Añadir
        </button>
      </div>
      <div v-if="inputMessage" class="mt-2 text-sm" :class="inputMessageClass">
        {{ inputMessage }}
      </div>
      <!-- Botón para actualizar manualmente -->
      <div class="mt-2 flex justify-end">
        <button
          @click.prevent="updateDataManually"
          class="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
          :disabled="isUpdating"
        >
          <span v-if="isUpdating" class="animate-spin">⟳</span>
          <span v-else>⟳</span>
          <span>Actualizar datos</span>
        </button>
      </div>
    </form>
    
    <!-- Últimos números ingresados -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-2 text-gray-700">Últimos números</h3>
      <div class="flex flex-wrap gap-2">
        <template v-if="lastNumbers.length">
          <div 
            v-for="number in lastNumbers" 
            :key="number.id"
            class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            :class="getNumberColorClass(number.color)"
          >
            {{ number.number }}
          </div>
        </template>
        <p v-else class="text-gray-500">No hay números ingresados aún</p>
      </div>
      <p class="text-xs text-gray-500 mt-2">El número de la izquierda es el más reciente jugado</p>
    </div>
    
    <!-- Tabla de estadísticas básicas -->
    <div class="mb-4">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-semibold text-gray-700">Estadísticas básicas</h3>
        <button 
          @click="fetchLastNumbers"
          class="bg-blue-600 text-white px-2 py-1 rounded text-xs"
          title="Actualizar estadísticas"
        >
          <span>↻</span>
        </button>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-100 p-3 rounded">
          <p class="font-medium">Par / Impar</p>
          <div class="flex justify-between mt-1">
            <span>Par: {{ basicStats.even || 0 }}</span>
            <span>Impar: {{ basicStats.odd || 0 }}</span>
          </div>
        </div>
        <div class="bg-gray-100 p-3 rounded">
          <p class="font-medium">Rojo / Negro</p>
          <div class="flex justify-between mt-1">
            <span>Rojo: {{ basicStats.red || 0 }}</span>
            <span>Negro: {{ basicStats.black || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Terminales (últimos dígitos) -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold mb-2 text-gray-700">Terminales</h3>
      <div class="grid grid-cols-5 gap-2">
        <div 
          v-for="i in 10" 
          :key="i-1" 
          class="bg-gray-100 p-2 rounded text-center"
          :class="hotTerminals.includes(i-1) ? 'bg-red-100' : ''"
        >
          <div class="font-bold">{{ i-1 }}</div>
          <div class="text-sm">{{ terminalCounts[i-1] || 0 }}</div>
        </div>
      </div>
    </div>
    
    <!-- Historial completo -->
    <div>
      <h3 class="text-lg font-semibold mb-2 text-gray-700">Historial completo</h3>
      <div class="max-h-60 overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="py-2 px-3 text-left">Fecha</th>
              <th class="py-2 px-3 text-left">Número</th>
              <th class="py-2 px-3 text-left">Color</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="!historyEntries.length">
              <tr class="border-b"><td colspan="3" class="py-2 px-3 text-center">Cargando historial...</td></tr>
            </template>
            <template v-else>
              <tr v-for="(entry, index) in historyEntries.slice(0, showFullHistory ? historyEntries.length : 20)" :key="'hist-' + entry.id" class="border-b">
                <td class="py-2 px-3">{{ formatDate(entry.timestamp) }}</td>
                <td class="py-2 px-3">{{ entry.number }}</td>
                <td class="py-2 px-3">
                  <span 
                    class="inline-block w-4 h-4 rounded-full"
                    :class="getNumberColorClass(entry.color)"
                  ></span>
                </td>
              </tr>
              <tr v-if="historyEntries.length > 20 && !showFullHistory" class="border-b">
                <td colspan="3" class="py-2 px-3 text-center">
                  <button @click="showFullHistory = true" class="text-blue-600 text-sm hover:underline">
                    Mostrar más...
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, provide } from 'vue';
import { getLastRouletteNumbers, processNumbersInput } from '~/utils/supabase';
import type { RouletteNumber } from '~/types';

// Evento de actualización para comunicación entre componentes
const emitter = inject('emitter') as any;

// Estado
const lastNumbers = ref<RouletteNumber[]>([]);
const historyEntries = ref<RouletteNumber[]>([]);
const numbersInput = ref('');
const basicStats = ref({
  odd: 0,
  even: 0,
  red: 0,
  black: 0
});
const terminalCounts = ref<number[]>(Array(10).fill(0));
const hotTerminals = ref<number[]>([]);
const inputMessage = ref('');
const inputMessageClass = ref('');
const showFullHistory = ref(false);
const isUpdating = ref(false);

// Cargar datos iniciales
onMounted(async () => {
  await fetchLastNumbers();
  
  // Escuchar eventos de otros componentes solo cuando se ingresan números nuevos
  if (emitter) {
    // Actualizar cuando se registra un nuevo número desde el chat o entrada manual
    emitter.on('number-registered', async (data) => {
      await fetchLastNumbers();
      refreshStats();
    });
  }
});

// Obtener los últimos números
const fetchLastNumbers = async () => {
  try {
    const data = await getLastRouletteNumbers(100);
    if (data && data.length) {
      // El orden ya viene desde Supabase con el último jugado primero (ordered by created_at desc)
      lastNumbers.value = data.slice(0, 10);
      historyEntries.value = data;
      
      calculateBasicStats(data);
      analyzeTerminals(data);
      
      // Emitir evento para que otros componentes se actualicen
      if (emitter) {
        emitter.emit('numbers-updated');
      }
    }
  } catch (error) {
    console.error('Error fetching roulette numbers:', error);
  }
};

// Calcular estadísticas básicas
const calculateBasicStats = (data: RouletteNumber[]) => {
  let odd = 0, even = 0, red = 0, black = 0;
  
  data.forEach(entry => {
    const num = entry.number;
    
    if (num !== 0) {
      if (num % 2 === 0) even++;
      else odd++;
    }
    
    if (entry.color === 'red') red++;
    else if (entry.color === 'black') black++;
  });
  
  basicStats.value = { odd, even, red, black };
};

// Analizar terminales (último dígito)
const analyzeTerminals = (data: RouletteNumber[]) => {
  const terminals = Array(10).fill(0);
  
  data.forEach(entry => {
    const terminal = entry.number % 10;
    terminals[terminal]++;
  });
  
  terminalCounts.value = terminals;
  
  // Encontrar terminales más frecuentes
  const terminalsSorted = terminals.map((count, digit) => ({ digit, count }))
                                 .sort((a, b) => b.count - a.count);
  hotTerminals.value = terminalsSorted.slice(0, 3).map(t => t.digit);
};

// Procesar nuevos números
const processNewNumbers = async () => {
  if (!numbersInput.value.trim()) return;
  
  try {
// Procesar nuevos números
      return;
    }
    
    if (result) {
      // Mostrar mensaje de éxito
      inputMessage.value = `Se han agregado ${result.processedCount} números correctamente. El último número jugado es: ${result.lastPlayed}`;
      inputMessageClass.value = 'text-green-600';
      
      // Recargar los datos solo después de ingresar un número
      await fetchLastNumbers();
      numbersInput.value = '';
      
      // Emitir eventos detallados para que otros componentes actualicen sus datos
      if (emitter) {
        // Evento general de que se procesaron números
        emitter.emit('numbers-processed', result.numbers);
        
        // Evento específico para solicitar que el chat actualice sus predicciones
        emitter.emit('request-predictions-update', {
          lastNumber: result.lastPlayed,
          allNumbers: result.numbers
        });
      }
      
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        inputMessage.value = '';
      }, 5000);
    }
  } catch (error) {
    console.error('Error processing numbers:', error);
    inputMessage.value = 'Error al procesar los números.';
    inputMessageClass.value = 'text-red-600';
  }
};

// Obtener clase de color para un número
const getNumberColorClass = (color: string) => {
  switch (color) {
    case 'red': return 'bg-red-600';
    case 'black': return 'bg-gray-800';
    case 'green': return 'bg-green-600';
    default: return 'bg-gray-400';
  }
};

// Formatear fecha
const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Método para actualizar estadísticas
const refreshStats = () => {
  calculateBasicStats(historyEntries.value);
  analyzeTerminals(historyEntries.value);
};

// Función para actualizar manualmente los datos desde la base de datos
const updateDataManually = async () => {
  try {
    isUpdating.value = true;
    inputMessage.value = 'Actualizando datos...';
    inputMessageClass.value = 'text-blue-600';
    
    await fetchLastNumbers();
    
    inputMessage.value = 'Datos actualizados correctamente';
    inputMessageClass.value = 'text-green-600';
    
    // Limpiar mensaje después de un tiempo
    setTimeout(() => {
      inputMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('Error al actualizar datos:', error);
    inputMessage.value = 'Error al actualizar datos';
    inputMessageClass.value = 'text-red-600';
  } finally {
    isUpdating.value = false;
  }
};
</script> 