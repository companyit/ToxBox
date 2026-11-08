// @vitest-environment jsdom
import { expect, test } from 'vitest'
import fs from 'node:fs/promises'
test('首页静态正文没有迁移区或隐藏重复入口，保留14工具与分区',async()=>{
 const doc=new DOMParser().parseFromString(await fs.readFile('dist-ssg/index.html','utf8'),'text/html')
 expect(doc.body.textContent).not.toContain('工具入口已迁移');expect(doc.querySelectorAll('.migration-section, .migration-entry')).toHaveLength(0)
 expect(doc.querySelectorAll('.tool-card a')).toHaveLength(20);expect(doc.querySelectorAll('.office .tool-card')).toHaveLength(13);expect(doc.querySelectorAll('.developer .tool-card')).toHaveLength(7)
 for(const id of ['office-tools','developer-tools','privacy'])expect(doc.getElementById(id)).not.toBeNull()
 expect(doc.querySelectorAll('.privacy-section a[href="/privacy/"]')).toHaveLength(1)
 expect(Array.from(doc.querySelectorAll('a')).some(a=>a.textContent?.startsWith('打开'))).toBe(false)
})
