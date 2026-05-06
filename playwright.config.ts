import { defineConfig, devices } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keeps browser binaries inside the repo so installs work reliably (CI + local). */
const repoRoot = dirname(fileURLToPath(import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH = join(repoRoot, '.playwright-browsers');

const host = '127.0.0.1';
const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://${host}:${port}`,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `npx vite preview --port ${port} --strictPort --host ${host}`,
    url: `http://${host}:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
