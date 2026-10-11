import assert from 'node:assert/strict'
import { afterEach } from 'vitest'
import { pages, getPage, notFoundPage } from '../../src/data/pages'
import { applyPageHead, createPageHead } from '../../src/utils/seo'
import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/routingSeo.test.ts')
const originalHead = document.head.innerHTML
const originalLang = document.documentElement.lang
afterEach(() => { document.head.innerHTML = originalHead; document.documentElement.lang = originalLang })
test('U08 DOM adapter deduplicates managed tags and removes stale canonical', () => {
  applyPageHead(document, createPageHead(pages[0]!, { mode: 'production', approvedOrigin: 'https://test.invalid' }))
  assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), 'https://test.invalid/')
  document.head.append(document.querySelector('meta[name="description"]')!.cloneNode(true))
  document.head.append(document.querySelector('meta[name="robots"]')!.cloneNode(true))
  applyPageHead(document, createPageHead(getPage('json-formatter'), { mode: 'preview' }))
  assert.equal(document.querySelectorAll('meta[name="description"]').length, 1)
  assert.equal(document.querySelectorAll('meta[name="robots"]').length, 1)
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 0)
  assert.equal(document.querySelector('meta[name="description"]')?.getAttribute('content'), getPage('json-formatter').description)
  applyPageHead(document, createPageHead(notFoundPage, { mode: 'preview' }))
  assert.equal(document.title, notFoundPage.title)
  assert.equal(document.documentElement.lang, 'zh-CN')
})
