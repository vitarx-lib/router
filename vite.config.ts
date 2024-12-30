import { defineConfig } from 'vite'
import vitarx from 'vite-plugin-vitarx'

export default defineConfig({
  plugins: [vitarx()],
  build: {
    outDir: 'dist-demo'
  }
})
