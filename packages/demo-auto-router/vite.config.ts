import vitarx from '@vitarx/plugin-vite'
import { fileURLToPath, URL } from 'node:url'
import VitarxRouter from 'vitarx-router/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    VitarxRouter({
      pagesDir: 'src/pages'
    }),
    vitarx()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
