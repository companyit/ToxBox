// @vitest-environment jsdom
import { test, expect } from 'vitest'
import fs from 'node:fs/promises'
test('日期计算静态空表单、办公入口、指南及 noindex',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/date-calculator/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('日期差与日期加减')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelector('#date-start')?.getAttribute('value')??'').toBe('')
 expect(doc.querySelector('#date-result')?.textContent).toBe('')
 expect(doc.querySelector('.site-header a[href="/office/"]')?.getAttribute('aria-current')).toBe('page')
 expect(doc.body.textContent).toContain('日期差为什么会是负数')
})
