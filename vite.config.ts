import vitarx from '@vitarx/vite-bundler'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vitarx()],
  build: {
    outDir: 'dist-demo'
  }
})
