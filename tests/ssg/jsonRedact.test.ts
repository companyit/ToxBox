// @vitest-environment jsdom
import {expect,test} from 'vitest'
import fs from 'node:fs/promises'
import {isSensitiveRoute,isSensitivePath} from '../../src/utils/sensitivePages'
test('JSON字段脱敏静态空态/noindex/指南与敏感隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/developer/json-redact/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('JSON 字段脱敏');expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelector('#redact-source')?.textContent).toBe('');expect(doc.querySelector('#redact-result')?.textContent).toBe('');expect(doc.querySelector('#redact-paths')?.textContent).toBe('[]');expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false);expect(isSensitiveRoute('json-redact')).toBe(true);expect(isSensitivePath('/developer/json-redact/')).toBe(true)
})
