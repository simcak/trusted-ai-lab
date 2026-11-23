import { defineConfig, devices } from '@playwright/test';
import { BASE_PATH } from './vite.config.ts';

const PORT = 4173;
const isCI = Boolean(process.env.CI);
const preview = `pnpm exec vite preview --port ${PORT} --strictPort`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries: a smoke test of a static site must not be flaky; a retry would hide it.
  retries: 0,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
  },
  // channel 'chromium' = full Chromium in new headless mode (closer to real browsers than headless shell).
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: {
    // CI builds in a previous step; locally build first so the smoke test always sees fresh output.
    command: isCI ? preview : `pnpm exec vite build && ${preview}`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !isCI,
  },
});
