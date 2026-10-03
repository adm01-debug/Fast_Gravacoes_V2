import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Dummy Supabase env vars for the test environment. The real `.env` is
// gitignored, so CI (and any contributor without a local .env) needs
// these placeholders so `createClient` doesn't throw at module load.
const TEST_ENV_DEFAULTS = {
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key',
  VITE_SUPABASE_PROJECT_ID: 'test-project',
};
for (const [k, v] of Object.entries(TEST_ENV_DEFAULTS)) {
  if (!process.env[k]) process.env[k] = v;
}

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(process.env.VITE_SUPABASE_PROJECT_ID),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**', '**/supabase/functions/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      // As suites de contrato importam os schemas REAIS de
      // supabase/functions/_shared/contracts.ts, que puxa o zod via URL Deno.
      // Redireciona para o zod do package.json (mesma API, v3.x).
      'https://esm.sh/zod@3.22.4': 'zod',
    },
    // Use the forks pool to isolate large simulation suites (500+ cases).
    // (Vitest 4 removed `poolOptions`; `singleFork` defaults to false.)
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        // Ratchet travado ~1pt abaixo do medido em 01/10/2026
        // (35.4 lines / 33.5 stmts / 28.7 funcs / 27.2 branches).
        // Só subir, nunca descer.
        lines: 34,
        functions: 27,
        branches: 26,
        statements: 32,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        'src/test/**',
        'src/**/*.d.ts',
        'src/integrations/**',
      ],
    },
  },
});
