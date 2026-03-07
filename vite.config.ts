import vitarx from '@vitarx/plugin-vite'
import dtsPlugin from 'unplugin-dts/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vitarx(),
    dtsPlugin({
      insertTypesEntry: true,
      bundleTypes: true
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: format => `vitarx-router.${format}.js`,
      formats: ['es']
    },
    rollupOptions: {
      external: ['vitarx']
    },
    minify: false
  }
})
