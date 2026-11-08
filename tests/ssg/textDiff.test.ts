// @vitest-environment jsdom
import {test,expect} from 'vitest'
import fs from 'node:fs/promises'
test('文本对比静态空输入、指南、noindex与敏感脚本隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/text-diff/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('文本差异对比')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex')
 expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelectorAll('.diff-editors textarea')).toHaveLength(2)
 for(const node of doc.querySelectorAll('textarea'))expect(node.textContent).toBe('')
 expect(doc.querySelector('.diff-result')).toBeNull()
 expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false)
})
