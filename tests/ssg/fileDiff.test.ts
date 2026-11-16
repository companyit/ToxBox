// @vitest-environment jsdom
import { expect, test } from 'vitest'
import fs from 'node:fs/promises'
import { isSensitivePath, isSensitiveRoute } from '../../src/utils/sensitivePages'
test('文件对比静态空态、noindex、指南及敏感隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/file-diff/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('文件对比')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelectorAll('input[type=file]')).toHaveLength(2)
 for(const node of doc.querySelectorAll('textarea')) expect(node.textContent).toBe('')
 expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect(doc.querySelector('.diff-result')).toBeNull()
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src+s.textContent))).toBe(false)
 expect(isSensitivePath('/office/file-diff/')).toBe(true);expect(isSensitiveRoute('file-diff')).toBe(true)
})
