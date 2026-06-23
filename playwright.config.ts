import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for SMG critical booking-flow E2E tests.
 * Browsers must be installed first: `npx playwright install chromium`.
 * The dev server is started automatically against DEMO mode.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_DEMO_MODE: 'true', PAYMENT_PROVIDER: 'mock' },
  },
});
