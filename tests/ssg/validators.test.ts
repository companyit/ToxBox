import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/ssg.test.mjs')
import assert from 'node:assert/strict'
import { validatePages, validateHtml } from '../../scripts/ssg.mjs'
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
