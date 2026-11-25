import { defineConfig, devices } from '@playwright/test';

const PORT = 8089;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // System Google Chrome: no separate browser download needed.
    channel: 'chrome',
    ...devices['Pixel 7'],
    trace: 'retain-on-failure',
    // SLOWMO=600 npm run test:e2e:headed — pause between actions to watch them.
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) },
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'mobile-chrome' }],
  webServer: {
    // Build the Expo web bundle once, then serve it.
    command: `npx expo export --platform web --output-dir dist-web && npx expo serve dist-web --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { CI: '1' },
  },
});
