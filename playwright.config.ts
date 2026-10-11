import { defineConfig } from '@playwright/test'

const runDir = process.env.WORKDEV_E2E_RUN_DIR
if (!runDir) throw new Error('请使用 npm test 或 npm run test:e2e；测试前必须生成本次SSG与摘要')
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 30_000,
  globalTimeout: 15 * 60_000,
  expect: { timeout: 5_000 },
  outputDir: runDir + '/artifacts',
  reporter: [
    ['line'],
    ['json', { outputFile: runDir + '/results.json' }],
    ['html', { outputFolder: runDir + '/html', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4177',
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177/',
    reuseExistingServer: false,
    timeout: 60_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
})
