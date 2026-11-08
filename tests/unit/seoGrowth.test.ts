import { test, expect } from 'vitest'
import config from '../../config/site-release.json'
import { indexablePages } from '../../src/data/indexing'
import { pages, getPage, notFoundPage } from '../../src/data/pages'
import { createPageHead, serializeStructuredData } from '../../src/utils/seo'
import { resolveSeoEnvironment } from '../../src/utils/seoEnvironment'
import { isSensitiveRoute } from '../../src/utils/sensitivePages'
import { tools } from '../../src/data/tools'
import { orderTools } from '../../src/utils/toolOrder'
import { searchTools } from '../../src/utils/toolSearch'
import type { Tool } from '../../src/types/tool'
const production = resolveSeoEnvironment({mode:'production',origin:config.productionOrigin}, config)
test('24个显式索引页面、19工具与排除项一致，敏感索引不放宽脚本隔离',()=>{
 expect(indexablePages).toHaveLength(24)
 expect(pages.filter(p=>p.indexable).map(p=>p.routeName).sort()).toEqual([...config.indexableRouteNames].sort())
 expect(new Set(indexablePages.map(p=>p.path)).size).toBe(24)
 const heads=pages.map(p=>createPageHead(p,production))
 expect(heads.filter(h=>h.canonical)).toHaveLength(24)
 for(const name of ['totp','contact','terms','not-found']){const h=createPageHead(getPage(name),production);expect(h.robots).toContain('noindex');expect(h.canonical).toBeUndefined();expect(h.structuredData).toBeUndefined()}
 for(const p of pages)for(const mode of ['local','preview'] as const){const h=createPageHead(p,{mode});expect(h.canonical).toBeUndefined();expect(h.structuredData).toBeUndefined();expect(h.robots).toContain('noindex')}
 expect(createPageHead(notFoundPage,production).canonical).toBeUndefined()
 expect(isSensitiveRoute('image-crop')).toBe(true);expect(createPageHead(getPage('image-crop'),production).canonical).toBe(config.productionOrigin+'/office/image-crop/')
})
test('批准清单拒绝遗漏、重复、越权路由、错误origin和动态属性',()=>{
 for(const names of [config.indexableRouteNames.slice(1),[...config.indexableRouteNames,'totp'],[...config.indexableRouteNames.slice(1),config.indexableRouteNames[1]]])expect(()=>resolveSeoEnvironment({mode:'production',origin:config.productionOrigin},{...config,indexableRouteNames:names})).toThrow()
 for(const origin of ['https://v7luck.com','http://www.v7luck.com','https://www.v7luck.com/','https://www.v7luck.com?a=1'])expect(()=>resolveSeoEnvironment({mode:'production',origin},config)).toThrow()
 const malicious=Object.defineProperty({...config},'schemaVersion',{get(){throw Error('must not run')}});expect(()=>resolveSeoEnvironment({},malicious)).toThrow('动态属性')
})
test('准确用途标题、真实面包屑和JSON-LD脚本安全序列化',()=>{
 expect(new Set(pages.map(p=>p.title)).size).toBe(pages.length)
 expect(getPage('home').title).toContain('PDF、图片、文本')
 expect(getPage('word-to-pdf').title).toContain('DOCX');expect(getPage('word-to-pdf').description).toContain('不支持旧DOC')
 const site=createPageHead(getPage('home'),production).structuredData!
 expect(site['@type']).toBe('WebSite');expect(site).not.toHaveProperty('potentialAction')
 const breadcrumb=createPageHead(getPage('image-crop'),production).structuredData!
 expect(breadcrumb['@type']).toBe('BreadcrumbList');expect(breadcrumb.itemListElement).toEqual([
  {'@type':'ListItem',position:1,name:'首页',item:config.productionOrigin+'/'},
  {'@type':'ListItem',position:2,name:'办公工具',item:config.productionOrigin+'/office/'},
  {'@type':'ListItem',position:3,name:'图片尺寸与裁剪',item:config.productionOrigin+'/office/image-crop/'}])
 const value={name:'</script><script>alert(1)</script>\u2028\u2029&"'}
 const serialized=serializeStructuredData(value)
 expect(serialized).not.toContain('<');expect(serialized).not.toContain('\u2028');expect(serialized).not.toContain('\u2029');expect(JSON.parse(serialized)).toEqual(value)
 expect(breadcrumb).not.toHaveProperty('aggregateRating')
})
test('用途优先级、稳定排序、不修改调用方与搜索顺序一致',()=>{
 expect(tools.filter(t=>t.category==='office').slice(0,5).map(t=>t.id)).toEqual(['image-convert','pdf-merge','pdf-split','images-to-pdf','image-crop'])
 expect(tools.filter(t=>t.category==='developer').slice(0,3).map(t=>t.id)).toEqual(['json-formatter','timestamp','base64'])
 expect(searchTools(tools,'PDF').map(t=>t.id)).toEqual(['pdf-merge','pdf-split','images-to-pdf','pdf-organizer','word-to-pdf'])
 const unknown:Tool={id:'unknown',name:'候选',description:'候选',category:'office',status:'planned'}
 const input=[unknown,tools[1]!,tools[0]!,{...unknown,id:'unknown-2'}];const before=[...input]
 expect(orderTools(input).map(t=>t.id)).toEqual([tools[0]!.id,tools[1]!.id,'unknown','unknown-2']);expect(input).toEqual(before)
})
