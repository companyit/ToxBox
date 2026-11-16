// @vitest-environment jsdom
import { expect, test } from 'vitest'
import fs from 'node:fs/promises'
import { isSensitiveRoute, isSensitivePath } from '../../src/utils/sensitivePages'
test('JSON结构对比静态空态、指南、noindex和敏感脚本隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/developer/json-diff/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('JSON 结构对比')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelectorAll('.editors textarea')).toHaveLength(2)
 for(const field of doc.querySelectorAll('textarea'))expect(field.textContent).toBe('')
 expect(doc.querySelector('.results')).toBeNull();expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false)
 expect(isSensitiveRoute('json-diff')).toBe(true);expect(isSensitivePath('/developer/json-diff/')).toBe(true)
})
