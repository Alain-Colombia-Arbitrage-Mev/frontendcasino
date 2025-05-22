// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxtjs/tailwindcss',
  ],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_KEY || '',
    }
  },
  // Optimizaciones de rendimiento
  app: {
    head: {
      htmlAttrs: {
        lang: 'es'
      },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      script: [
        // Agregamos un script para manejar globalmente los errores de WebSocket
        { 
          innerHTML: `
            window.addEventListener('error', function(e) {
              if (e && e.message && (e.message.includes('WebSocket') || e.message.includes('ws://'))) {
                console.log('[Interceptado] Error WebSocket:', e.message);
                e.preventDefault();
                e.stopPropagation();
                return true;
              }
            }, {capture: true});
          `,
          type: 'text/javascript'
        }
      ]
    },
  },
  // Configuración del servidor de desarrollo
  devServer: {
    port: 3000,
    host: 'localhost',
  },
  // Optimizaciones de build
  nitro: {
    prerender: {
      crawlLinks: false
    },
    minify: true,
    // Configuración para evitar problemas de permisos en Windows
    output: {
      dir: './.output',
      serverDir: './.output/server',
      publicDir: './.output/public'
    },
    // Evitar eliminar directorios antes de compilar
    storage: {
      fs: {
        driver: 'fs',
        base: './.data/storage'
      }
    }
  },
  // Optimizaciones de Vite
  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        clientPort: 24678, // Puerto específico para HMR
        timeout: 5000, // Aumentar timeout para conexiones HMR
      },
      fs: {
        strict: false // Reduce restricciones de acceso a archivos
      },
      watch: {
        usePolling: true, // Mejor compatibilidad en sistemas Windows
        interval: 1000
      }
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
        }
      }
    },
    optimizeDeps: {
      include: ['vue', '@supabase/supabase-js']
    }
  },
  experimental: {
    renderJsonPayloads: true,
    viewTransition: true,
  }
})
