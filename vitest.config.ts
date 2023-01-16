import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/tests/**/*.spec.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
})
