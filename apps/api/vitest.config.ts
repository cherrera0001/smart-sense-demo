import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Tests comparten una DB Neon de desarrollo: sin paralelismo de archivos para evitar
    // contención. El aislamiento de datos se logra con emails/orgs únicos (randomUUID).
    fileParallelism: false,
    pool: 'forks',
  },
});
