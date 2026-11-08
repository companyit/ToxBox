// @vitest-environment jsdom
import {test,expect} from 'vitest'
import fs from 'node:fs/promises'
test('图片裁剪独立静态页、空状态、指南和敏感隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/image-crop/index.html','utf8'),'text/html')
 expect(doc.querySelector('.breadcrumbs a[href="/office/"]')?.textContent).toBe('办公工具')
 expect(doc.querySelector('h1')?.textContent).toBe('图片尺寸与裁剪')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelectorAll('a[download]')).toHaveLength(0)
 expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect(doc.querySelector('.site-header a[href="/office/"]')?.getAttribute('aria-current')).toBe('page')
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false)
})
