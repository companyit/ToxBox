// @vitest-environment jsdom
import { test, expect } from 'vitest'
import fs from 'node:fs/promises'
import { pages, notFoundPage } from '../../src/data/pages'
import { site } from '../../src/data/site'
import { createPageHead } from '../../src/utils/seo'
test('22份静态页面品牌、语义与favicon一致，无旧品牌残留',async()=>{
 for(const page of [...pages,notFoundPage]){
  const html=await fs.readFile('dist-ssg/'+(page===notFoundPage?'404.html':page.path.slice(1)+'index.html'),'utf8')
  const doc=new DOMParser().parseFromString(html,'text/html')
  expect(doc.title).toContain(site.displayName);expect(doc.querySelector('.brand')?.getAttribute('aria-label')).toBe(`${site.displayName}，返回首页`)
  expect(doc.querySelector('.brand-mark svg')?.getAttribute('aria-hidden')).toBe('true')
  expect(doc.querySelector('.footer-brand')?.textContent).toContain(site.name)
  expect(doc.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.svg')
  expect(doc.querySelector('link[rel="alternate icon"]')?.getAttribute('href')).toBe('/favicon.ico')
  expect(html).not.toMatch(/WorkDev Tools|ToxBox|Vemlito/)
 }
 const head=createPageHead(pages[0]!,{mode:'production',approvedOrigin:'https://test.invalid'})
 expect(head.openGraph?.['og:site_name']).toBe('顺手集 ToolHug')
})
test('favicon产物与批准公共资源相同，ICO含16/32/48px真实PNG帧',async()=>{
 for(const name of ['favicon.svg','favicon.ico'])expect(await fs.readFile('dist-ssg/'+name)).toEqual(await fs.readFile('public/'+name))
 const ico=await fs.readFile('dist-ssg/favicon.ico');expect(ico.readUInt16LE(0)).toBe(0);expect(ico.readUInt16LE(2)).toBe(1);expect(ico.readUInt16LE(4)).toBe(3)
 for(const [i,size] of [16,32,48].entries()){
  const entry=6+i*16,offset=ico.readUInt32LE(entry+12),length=ico.readUInt32LE(entry+8),png=ico.subarray(offset,offset+length)
  expect([ico[entry],ico[entry+1]]).toEqual([size,size]);expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([size,size]);expect(offset+length).toBeLessThanOrEqual(ico.length)
 }
 const svg=await fs.readFile('dist-ssg/favicon.svg','utf8');expect(svg).toContain('prefers-color-scheme:dark');expect(svg).not.toMatch(/<script|(?:href|src)=/)
})
