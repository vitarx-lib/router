import Vitarx from '@vitarx/plugin-vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [Vitarx()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['tests/core/**/*.{test,spec}.ts', 'tests/components/**/*.{test,spec}.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }]
          },
          testTimeout: 10000
        }
      },
      {
        extends: true,
        test: {
          name: 'vite',
          include: ['tests/vite/**/*.{test,spec}.ts'],
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
