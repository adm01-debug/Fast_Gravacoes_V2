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
        lines: 20,
        functions: 17,
        branches: 15,
        statements: 20,
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
