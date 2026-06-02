import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(frontendDir, '..', 'backend');

const backendEnv = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pomodoria',
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-test-secret-minimum-32-characters-long',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'e2e-test-refresh-secret-32-chars-min',
};

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm start',
      cwd: backendDir,
      url: 'http://127.0.0.1:5000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: backendEnv,
    },
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
