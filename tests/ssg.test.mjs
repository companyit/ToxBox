import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { validatePages, validateHtml } from '../scripts/ssg.mjs'
const pages = Array.from({length:8},(_,i)=>({routeName:'p'+i,path:i?'/p'+i+'/':'/',title:'t',description:'d'}))
test('SSG path validation rejects duplicates, traversal and missing pages',()=>{
 validatePages(pages)
 assert.throws(()=>validatePages(pages.slice(1)))
 for(const change of [{path:'/'},{path:'/../escape/'},{routeName:'p0'},{description:''}]) assert.throws(()=>validatePages(pages.map((p,i)=>i===1?{...p,...change}:p)))
})
test('SSG validation rejects missing body and missing assets',async()=>{
 await assert.rejects(validateHtml('<div></div>','dist-ssg'))
 await assert.rejects(validateHtml('<title>test</title><meta name="description" content="test"><div data-render-mode="ssg"><main><h1>x</h1></main><script src="/assets/MISSING.js"></script></div>','dist-ssg'))
})
test('SSG output covers eight pages and real 404 with no preview SEO residue',async()=>{
 for(const file of ['index.html','office/index.html','office/text-statistics/index.html','developer/index.html','developer/json-formatter/index.html','developer/url-encoder/index.html','about/index.html','privacy/index.html','404.html']) {
  const html=await fs.readFile('dist-ssg/'+file,'utf8');await validateHtml(html,'dist-ssg')
  assert.match(html,/<meta name="robots" content="noindex,follow">/);assert.doesNotMatch(html,/rel="canonical"/)
  if(file==='404.html')assert.match(html,/页面不存在/)
 }
 const actual=(await fs.readdir('dist-ssg',{recursive:true})).filter(p=>p.endsWith('.html'));assert.equal(actual.length,9)
 for(const file of ['robots.txt','sitemap.xml','entry-server.js'])await assert.rejects(fs.access('dist-ssg/'+file))
})
