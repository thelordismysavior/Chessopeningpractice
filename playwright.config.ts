import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  globalSetup: './test/browser/global-setup.ts',
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_APPROVED_EMAIL: 'test@example.com',
      VITE_FIREBASE_API_KEY: 'demo-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.local',
      VITE_FIREBASE_PROJECT_ID: 'demo-no-project',
      VITE_FIREBASE_STORAGE_BUCKET: 'test',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'test',
      VITE_FIREBASE_APP_ID: 'test',
      VITE_FIREBASE_USE_EMULATORS: 'true',
    },
  },
});
