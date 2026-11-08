// @vitest-environment jsdom
import { test, expect } from 'vitest'
import fs from 'node:fs/promises'
test('PDF整理静态空界面、指南、noindex与敏感隔离', async () => {
  const doc = new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/pdf-organizer/index.html', 'utf8'), 'text/html')
  expect(doc.querySelector('h1')?.textContent).toBe('PDF 页面整理')
  expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex')
  expect(doc.querySelector('link[rel=canonical]')).toBeNull()
  expect(doc.querySelectorAll('.page-grid li')).toHaveLength(0)
  expect(doc.querySelector('.tool-guide')).not.toBeNull()
  expect(doc.querySelector('.site-header a[href="/office/"]')?.getAttribute('aria-current')).toBe('page')
  expect([...doc.scripts].some(s => /google|adsbygoogle/.test(s.src))).toBe(false)
})
