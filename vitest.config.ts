import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const [major, minor] = process.versions.node.split('.').map(Number)
if (major !== 24 || minor! < 15) throw new Error('测试要求 Node.js 24.15.0 或更新的 24.x')
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    allowOnly: false,
    projects: [
      { extends: true, test: { name: 'unit', environment: 'node', include: ['tests/unit/**/*.test.ts'] } },
      { extends: true, test: { name: 'components', environment: 'jsdom', include: ['tests/components/**/*.test.ts'], fileParallelism: false } },
      { extends: true, test: { name: 'ssg', environment: 'node', include: ['tests/ssg/**/*.test.ts'], fileParallelism: false } },
    ],
  },
})
