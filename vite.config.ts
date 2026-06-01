import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // firebase-admin is Node-only — never bundle it into the browser build
  optimizeDeps: {
    exclude: ['firebase-admin'],
  },
  build: {
    rollupOptions: {
      external: ['firebase-admin'],
    },
  },
})
