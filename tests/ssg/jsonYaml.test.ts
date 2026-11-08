// @vitest-environment jsdom
import {test,expect} from 'vitest'
import fs from 'node:fs/promises'
test('JSON/YAML独立静态页、空结果、指南和敏感隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/developer/json-yaml/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('JSON ↔ YAML 转换')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelector('#table-result')?.textContent).toBe('')
 expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect(doc.querySelector('.site-header a[href="/developer/"]')?.getAttribute('aria-current')).toBe('page')
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false)
 const notices=await fs.readFile('dist-ssg/third-party-notices.txt','utf8');expect(notices).toContain('YAML 2.9.1');expect(notices).toContain('Copyright Eemeli Aro')
})
