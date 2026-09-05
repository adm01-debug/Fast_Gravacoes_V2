import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    // Use an explicit IPv4 URL (not `port`, which probes localhost and may
    // resolve to ::1) so the readiness check matches the preview server's
    // 127.0.0.1 bind and the baseURL above.
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    // Headroom for the preview server to come up on slow/loaded CI runners.
    timeout: 120_000,
  },
});
