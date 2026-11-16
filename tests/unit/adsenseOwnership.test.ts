import { adSenseScriptFor, adSenseDocumentTransition } from '../../src/utils/adsense'
import { test, expect } from 'vitest'
import { pages, notFoundPage, getPage } from '../../src/data/pages'
import { createPageHead } from '../../src/utils/seo'
const production = {mode:'production' as const,approvedOrigin:'https://www.v7luck.com'}
test('AdSense只在正式origin首页输出发布商标记，其他页和环境无标记',()=>{
 for(const page of [...pages,notFoundPage]){
  expect(createPageHead(page,production).adsenseAccount).toBe(page.routeName==='home'?'ca-pub-2420716265318225':undefined)
  for(const mode of ['local','preview'] as const)expect(createPageHead(page,{mode}).adsenseAccount).toBeUndefined()
 }
 expect(createPageHead(getPage('home'),{mode:'production',approvedOrigin:'https://test.invalid'}).adsenseAccount).toBeUndefined()
})

test('广告只在4页正式白名单，关闭开关或preview/其他origin均不输出',()=>{
 const paths=['/','/office/','/developer/','/about/']
 for(const p of [...pages,notFoundPage])expect(Boolean(createPageHead(p,production).adsenseScript)).toBe(paths.includes(p.path))
 for(const path of paths){
  expect(adSenseScriptFor(path,production)).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2420716265318225')
  expect(adSenseScriptFor(path,production,false)).toBeUndefined()
  expect(adSenseScriptFor(path,{mode:'preview'})).toBeUndefined()
  expect(adSenseScriptFor(path,{mode:'production',approvedOrigin:'https://test.invalid'})).toBeUndefined()
 }
 expect(adSenseDocumentTransition('/','/office/',production)).toBe(false)
 for(const path of ['/office/file-diff/','/developer/json-formatter/','/privacy/','/404/']){
  expect(adSenseDocumentTransition('/',path,production)).toBe(true)
  expect(adSenseDocumentTransition(path,'/',production)).toBe(true)
  expect(adSenseDocumentTransition('/',path,{mode:'preview'})).toBe(false)
 }
})
