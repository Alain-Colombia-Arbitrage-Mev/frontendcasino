<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-gray-800 text-white p-4">
      <h1 class="text-2xl font-bold text-center">AI Casino - Ruleta Analítica</h1>
    </header>

    <main class="container mx-auto p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Columna 1: Historial -->
        <HistorialRuleta />
        
        <!-- Columna 2: Chat en vivo -->
        <ChatBotRuleta />
        
        <!-- Columna 3: Estadísticas -->
        <EstadisticasRuleta />
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
