import { defineConfig } from 'vite'
import vitarxPlugin from 'vite-plugin-vitarx'
import dtsPlugin from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vitarxPlugin(),
    dtsPlugin({
      include: ['lib'],
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: 'lib/index.ts',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vitarx', 'vitarx/jsx-runtime']
    }
  }
})
