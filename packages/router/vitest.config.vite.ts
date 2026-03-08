import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/vite/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests']
    }
  }
})
