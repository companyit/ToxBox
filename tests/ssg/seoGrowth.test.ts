// @vitest-environment jsdom
import { test, expect } from 'vitest'
import fs from 'node:fs/promises'
import { pages, notFoundPage } from '../../src/data/pages'
import { tools } from '../../src/data/tools'
test('preview全部28HTML无索引泄露，首页/分类保留可抓取20入口与推广顺序',async()=>{
 for(const p of [...pages,notFoundPage]){
  const html=await fs.readFile('dist-ssg/'+(p===notFoundPage?'404.html':p.path.slice(1)+'index.html'),'utf8')
  const doc=new DOMParser().parseFromString(html,'text/html')
  expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow')
  expect(doc.querySelectorAll('link[rel=canonical],script[type="application/ld+json"]')).toHaveLength(0)
  expect(doc.title).toBe(p.title)
 }
 const home=new DOMParser().parseFromString(await fs.readFile('dist-ssg/index.html','utf8'),'text/html')
 expect(home.querySelector('.hero-description')?.textContent).toContain('PDF、图片、文本与开发工具')
 expect([...home.querySelectorAll('.tool-card a')].map(a=>a.getAttribute('href'))).toEqual(tools.map(t=>pages.find(p=>t.status==='preview'&&p.routeName===t.routeName)!.path))
 const office=new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/index.html','utf8'),'text/html')
 expect(office.querySelector('.page-heading p')?.textContent).toContain('PDF合并')
 expect(office.querySelector('.tool-card h3')?.textContent).toBe('图片压缩与格式转换')
})
