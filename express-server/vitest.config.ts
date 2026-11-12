import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'src/generated'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/docs/openapi.spec.ts',
        'src/server.ts',
        '**/*.types.ts',
        '**/*.constants.ts',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
