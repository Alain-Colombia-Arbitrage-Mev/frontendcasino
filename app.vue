<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-gray-800 text-white p-4">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">AI Casino - Ruleta Analítica</h1>
        
        <!-- Pestañas de navegación -->
        <nav class="flex gap-4">
          <button 
            @click="tabActiva = 'principal'"
            :class="[
              'px-4 py-2 rounded transition-colors',
              tabActiva === 'principal' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            ]"
          >
            🎰 Principal
          </button>
          <button 
            @click="tabActiva = 'admin'"
            :class="[
              'px-4 py-2 rounded transition-colors',
              tabActiva === 'admin' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            ]"
          >
            ⚙️ Administración
          </button>
        </nav>
      </div>
    </header>

    <main class="container mx-auto p-4">
      <!-- Vista Principal -->
      <div v-if="tabActiva === 'principal'" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Columna 1: Historial -->
        <HistorialRuleta />
        
        <!-- Columna 2: Chat en vivo -->
        <ChatBotRuleta />
        
        <!-- Columna 3: Estadísticas -->
        <EstadisticasRuleta />
      </div>
      
      <!-- Vista de Administración -->
      <div v-if="tabActiva === 'admin'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Panel de Purga de Base de Datos -->
        <PurgaBaseDatos />
        
        <!-- Panel de Configuración (placeholder para futuras funciones) -->
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h2 class="text-xl font-bold mb-4 text-gray-800">Configuración del Sistema</h2>
          <div class="space-y-4">
            <div class="bg-gray-50 p-3 rounded">
              <h3 class="font-medium text-gray-700 mb-2">Estado del Sistema</h3>
              <div class="text-sm text-gray-600">
                <p>• Sistema de purga automática: <span class="text-green-600 font-medium">🟢 Activo</span></p>
                <p>• Frecuencia de purga: <span class="font-medium">Cada 48 horas</span></p>
                <p>• Validación de duplicados: <span class="text-green-600 font-medium">🟢 Activa</span></p>
                <p>• Reconocimiento de voz: <span class="text-green-600 font-medium">🟢 Disponible</span></p>
              </div>
            </div>
            
            <div class="bg-blue-50 p-3 rounded border border-blue-200">
              <h3 class="font-medium text-blue-700 mb-2">Información</h3>
              <p class="text-sm text-blue-600">
                Este panel de administración permite gestionar la base de datos y monitorear el estado del sistema.
                Más funciones administrativas se agregarán en futuras actualizaciones.
              </p>
            </div>
            
            <div class="bg-yellow-50 p-3 rounded border border-yellow-200">
              <h3 class="font-medium text-yellow-700 mb-2">⚠️ Recomendaciones</h3>
              <ul class="text-sm text-yellow-600 space-y-1">
                <li>• Revisa regularmente el estado de la base de datos</li>
                <li>• Ejecuta purgas manuales si es necesario</li>
                <li>• Mantén al menos 50 registros en la base de datos</li>
                <li>• Verifica que el sistema automático esté funcionando</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted } from 'vue';
import mitt from 'mitt';
import HistorialRuleta from '~/components/HistorialRuleta.vue';
import ChatBotRuleta from '~/components/ChatBotRuleta.vue';
import EstadisticasRuleta from '~/components/EstadisticasRuleta.vue';
import PurgaBaseDatos from '~/components/PurgaBaseDatos.vue';

// Estado de navegación
const tabActiva = ref('principal');

// Crear emisor de eventos para comunicación entre componentes
const emitter = mitt();

// Proporcionar el emisor a todos los componentes
provide('emitter', emitter);

// Escuchar eventos para actualización en tiempo real
onMounted(() => {
  // Cuando se procesan nuevos números, actualizar todos los componentes
  emitter.on('numbers-processed', (numbers: any) => {
    // Solo emitir eventos para actualizar cuando se procesan nuevos números
    emitter.emit('update-groups');
    emitter.emit('update-stats');
  });
  
  // Solo actualizar cuando explícitamente se ingrese un número
  emitter.on('number-registered', () => {
    emitter.emit('update-groups');
    emitter.emit('update-stats');
  });
});
</script>

<style>
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Algunos estilos globales adicionales */
.card-hover:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}
</style>
