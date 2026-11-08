// @vitest-environment jsdom
import {test,expect} from 'vitest'
import fs from 'node:fs/promises'
test('复合文本工作台静态预设、空结果、指南与敏感脚本隔离',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/text-workbench/index.html','utf8'),'text/html')
 expect(doc.querySelector('h1')?.textContent).toBe('文本处理工作台')
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('noindex');expect(doc.querySelector('link[rel=canonical]')).toBeNull()
 expect(doc.querySelector('#workflow-input')?.textContent).toBe('');expect(doc.querySelectorAll('.workflow-steps li')).toHaveLength(4)
 expect(doc.querySelector('.workflow-result')).toBeNull();expect(doc.querySelector('.tool-guide')).not.toBeNull()
 expect(doc.querySelector('.site-header a[href="/office/"]')?.getAttribute('aria-current')).toBe('page')
 expect([...doc.scripts].some(s=>/google|adsbygoogle/i.test(s.src))).toBe(false)
})
