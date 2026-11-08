import { afterEach, test, expect } from 'vitest'
import { createPageHead, applyPageHead } from '../../src/utils/seo'
import { getPage, notFoundPage } from '../../src/data/pages'
const original=document.head.innerHTML
afterEach(()=>{document.head.innerHTML=original})
const env={mode:'production',approvedOrigin:'https://www.v7luck.com'} as const
test('JSON-LD单一节点、SSR复用去重、导航/404/preview清理',()=>{
 const schema=()=>document.querySelectorAll('script[data-workdev-structured-data]')
 const head=createPageHead(getPage('image-crop'),env)
 applyPageHead(document,head);expect(schema()).toHaveLength(1);expect(JSON.parse(schema()[0]!.textContent!)).toEqual(head.structuredData)
 document.head.append(schema()[0]!.cloneNode(true));applyPageHead(document,head);expect(schema()).toHaveLength(1)
 applyPageHead(document,createPageHead(getPage('home'),env));expect(JSON.parse(schema()[0]!.textContent!)['@type']).toBe('WebSite')
 applyPageHead(document,createPageHead(notFoundPage,env));expect(schema()).toHaveLength(0);expect(document.querySelector('link[rel=canonical]')).toBeNull()
 applyPageHead(document,head);applyPageHead(document,createPageHead(getPage('image-crop'),{mode:'preview'}));expect(schema()).toHaveLength(0)
})
