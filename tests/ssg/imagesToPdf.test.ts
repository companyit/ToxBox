// @vitest-environment jsdom
import { test, expect } from 'vitest'
import fs from 'node:fs/promises'
test('图片转 PDF 静态空列表、办公分类、指南及敏感脚本隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/images-to-pdf/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('图片转 PDF');expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull();expect(doc.querySelectorAll('.image-controls li')).toHaveLength(0);expect(doc.querySelector('a[download]')).toBeNull()
 expect(doc.querySelector('.site-header a[href="/office/"]')?.getAttribute('aria-current')).toBe('page');expect(doc.body.textContent).toContain('会裁掉图片边缘吗')
 expect(Array.from(doc.scripts).some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false)
})
