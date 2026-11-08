// @vitest-environment jsdom
import {test,expect} from 'vitest'
import fs from 'node:fs/promises'
test('图片转换独立静态页、空状态、指南和敏感隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/image-convert/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('图片压缩与格式转换')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelectorAll('a[download]')).toHaveLength(0)
 expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect(doc.querySelector('.site-header a[href="/office/"]')?.getAttribute('aria-current')).toBe('page')
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false)
})
