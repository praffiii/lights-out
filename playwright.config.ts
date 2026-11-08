import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://localhost:4400', channel: 'chrome', headless: false },
  webServer: {
    command: 'bun run build && bunx vite preview --port 4400 --strictPort',
    url: 'http://localhost:4400',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1470, height: 830 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
})
