import Vitarx from '@vitarx/plugin-vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [Vitarx()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          include: ['tests/{core,components}/**/*.{test,spec}.ts'],
          environment: 'jsdom',
          testTimeout: 30000
        }
      },
      {
        extends: true,
        test: {
          name: 'file-router',
          include: ['tests/file-router/**/*.{test,spec}.ts'],
          environment: 'node',
          testTimeout: 30000
        }
      },
      {
        extends: true,
        test: {
          name: 'plugin-vite',
          include: ['tests/plugin-vite/**/*.{test,spec}.ts'],
          environment: 'node',
          testTimeout: 30000
        }
      }
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests']
    }
  }
})
