import { defineConfig } from 'vite'
import dtsPlugin from 'vite-plugin-dts'
import vitarxPlugin from 'vite-plugin-vitarx'

export default defineConfig({
  plugins: [
    vitarxPlugin(),
    dtsPlugin({
      include: ['lib'],
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: 'tsconfig.lib.json'
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
