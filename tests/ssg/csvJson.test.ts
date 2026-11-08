// @vitest-environment jsdom
import { expect, test } from 'vitest'
import fs from 'node:fs/promises'
test('CSV/JSON 预渲染为空表单，指南与办公入口完整，保持 noindex', async () => {
  const doc = new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/csv-json/index.html', 'utf8'), 'text/html')
  expect(doc.querySelectorAll('#app')).toHaveLength(1)
  expect(doc.querySelector('h1')?.textContent).toBe('CSV 与 JSON 表格互转')
  expect(doc.querySelector<HTMLTextAreaElement>('#table-input')?.value).toBe('')
  expect(doc.querySelector<HTMLTextAreaElement>('#table-result')?.value).toBe('')
  expect(doc.querySelectorAll('.tool-guide h4')).toHaveLength(2)
  expect(doc.querySelector('.tool-guide')?.textContent).toContain('二维字符串数组')
  expect(doc.querySelector('.breadcrumbs a[href="/office/"]')).not.toBeNull()
  expect(doc.querySelector('.site-header nav a[href="/office/"]')?.getAttribute('aria-current')).toBe('page')
  expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow')
  expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
})
