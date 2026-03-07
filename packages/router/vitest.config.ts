import Vitarx from '@vitarx/plugin-vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [Vitarx()],
  test: {
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      // 使用V8内置的覆盖率收集器
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests']
    },
    testTimeout: 10000
  }
})
