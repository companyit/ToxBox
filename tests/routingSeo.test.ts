import test from 'node:test'
import assert from 'node:assert/strict'
import { createRouter, createMemoryHistory } from 'vue-router'
import { pages, getPage, notFoundPage, canonicalPath } from '../src/data/pages.ts'
import { routes, normalizeKnownPath } from '../src/router/routes.ts'
import { createPageHead, applyPageHead } from '../src/utils/seo.ts'

// 真Router内存History，组件替身不验证SFC/DOM/浏览器历史，浏览器证据另列。
function memoryRouter() {
 const router=createRouter({history:createMemoryHistory(),strict:true,sensitive:true,routes:routes.map(r=>({...r,component:{render:()=>null}}))})
 router.beforeEach(normalizeKnownPath)
 return router
}
test('U01 eight unique static pages and a non-indexable 404',()=>{
 assert.equal(pages.length,8)
 for(const field of ['path','routeName','title','description'] as const)assert.equal(new Set(pages.map(p=>p[field])).size,8)
 assert.equal(routes.length,9);assert.equal(notFoundPage.indexable,false)
 for(const p of pages)assert.ok(routes.find(r=>r.name===p.routeName)?.component)
})
for(const page of pages)test(`route ${page.path} resolves to ${page.routeName}`,async()=>{
 const r=memoryRouter();await r.push(page.path);assert.equal(r.currentRoute.value.name,page.routeName);assert.equal(r.currentRoute.value.path,page.path)
})
test('U02/03 known paths normalize preserving query/hash, unknown and wrong case stay 404',async()=>{
 const r=memoryRouter();await r.push('/developer/json-formatter?x=1#help');assert.equal(r.currentRoute.value.fullPath,'/developer/json-formatter/?x=1#help')
 assert.equal(normalizeKnownPath({path:'/office/',query:{},hash:''}),undefined)
 for(const path of ['/Office/','/Unknown','/office//']){await r.push(path);assert.equal(r.currentRoute.value.name,'not-found');assert.equal(r.currentRoute.value.path,path)}
})
test('U04 page model switches and not-found never inherits previous tool',()=>{
 for(const name of ['home','json-formatter','not-found','privacy']){const h=createPageHead(getPage(name),{mode:'preview'});assert.equal(h.title,getPage(name).title);assert.equal(h.canonical,undefined);assert.equal(h.robots,'noindex,follow')}
 assert.equal(getPage(Symbol()).routeName,'not-found')
})
test('U05 local/preview do not infer canonical from origin',()=>{
 for(const mode of ['local','preview'] as const){const h=createPageHead(pages[0]!,{mode,approvedOrigin:'https://test.invalid'});assert.equal(h.canonical,undefined);assert.equal(h.robots,'noindex,follow')}
})
test('U06 production rejects missing or invalid approved HTTPS origin',()=>{
 for(const approvedOrigin of [undefined,'bad','http://test.invalid','https://a:b@test.invalid','https://test.invalid/path','https://test.invalid/?a=1','https://test.invalid/#x','https://test.invalid/'])assert.throws(()=>createPageHead(pages[0]!,{mode:'production',approvedOrigin}),/SEO/)
})
test('U07 approved test-only origin emits canonical paths and no 404 canonical',()=>{
 for(const p of pages){const h=createPageHead(p,{mode:'production',approvedOrigin:'https://test.invalid'});assert.equal(h.canonical,'https://test.invalid'+p.path);assert.equal(h.robots,'index,follow')}
 assert.equal(createPageHead(notFoundPage,{mode:'production',approvedOrigin:'https://test.invalid'}).canonical,undefined)
})
test('U08 DOM adapter deduplicates managed tags and removes stale canonical',()=>{
 const nodes: {name?:string;content?:string;rel?:string;href?:string;remove:()=>void}[]=[]
 const fake={title:'',documentElement:{lang:''},createElement:()=>{const n={remove:()=>{nodes.splice(nodes.indexOf(n),1)}};return n},head:{append:(n:typeof nodes[number])=>{if(!nodes.includes(n))nodes.push(n)},querySelectorAll:(selector:string)=>nodes.filter(n=>selector.startsWith('meta')?selector.includes(`"${n.name}"`):n.rel==='canonical')}}
 const doc=fake as unknown as Document
 applyPageHead(doc,createPageHead(pages[0]!,{mode:'production',approvedOrigin:'https://test.invalid'}))
 const duplicate={...nodes[0]!,remove:()=>{nodes.splice(nodes.indexOf(duplicate),1)}};nodes.push(duplicate)
 applyPageHead(doc,createPageHead(getPage('json-formatter'),{mode:'preview'}))
 assert.equal(nodes.filter(n=>n.name==='description').length,1);assert.equal(nodes.filter(n=>n.name==='robots').length,1);assert.equal(nodes.filter(n=>n.rel==='canonical').length,0)
 applyPageHead(doc,createPageHead(notFoundPage,{mode:'preview'}));assert.equal(fake.title,notFoundPage.title);assert.equal(fake.documentElement.lang,'zh-CN')
})
test('U09 API/resources are not known page or canonical targets',async()=>{
 const r=memoryRouter()
 for(const path of ['/api/v1/example','/assets/missing.js']){assert.equal(canonicalPath(path),undefined);await r.push(path);assert.equal(r.currentRoute.value.name,'not-found')}
})
test('memory history normalization replace does not introduce an extra entry',async()=>{
 const r=memoryRouter();await r.push('/');await r.push('/office');assert.equal(r.currentRoute.value.path,'/office/');const done=new Promise<void>(resolve=>{const remove=r.afterEach(()=>{remove();resolve()})});r.back();await done;assert.equal(r.currentRoute.value.path,'/')
})
