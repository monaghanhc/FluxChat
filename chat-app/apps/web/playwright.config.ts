import { defineConfig, devices } from '@playwright/test';

const API_URL = 'http://127.0.0.1:4000';
const WEB_URL = 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @chat/api dev:e2e',
      port: 4000,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '4000',
        JWT_SECRET: 'e2e-secret',
        CLIENT_ORIGIN: WEB_URL,
      },
    },
    {
      command: 'pnpm --filter @chat/web dev --host 127.0.0.1 --port 5173',
      port: 5173,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_URL: API_URL,
        VITE_SOCKET_URL: API_URL,
      },
    },
  ],
});
