import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: './packages/router/vitest.config.ts',
        test: {
          name: 'router',
          root: './packages/router'
        }
      }
    ]
  }
})
