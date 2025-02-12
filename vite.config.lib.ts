import vitarxPlugin from '@vitarx/vite-bundler'
import { defineConfig } from 'vite'
import dtsPlugin from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vitarxPlugin(),
    dtsPlugin({
      include: ['lib'],
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: './tsconfig.lib.json'
    })
  ],
  esbuild: {
    // 不压缩标识符（如函数名）
    minifyIdentifiers: false
  },
  build: {
    lib: {
      entry: 'lib/index.ts',
      name: 'VitarxRouter',
      fileName: format => `vitarx-router.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['vitarx', 'vitarx/jsx-runtime'],
      output: {
        globals: {
          vitarx: 'Vitarx',
          'vitarx/jsx-runtime': 'Vitarx'
        }
      }
    }
  }
})
