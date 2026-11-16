import { afterEach, expect, test } from 'vitest'
import { getPage } from '../../src/data/pages'
import { applyPageHead, createPageHead } from '../../src/utils/seo'
import { validateAdSenseDocument } from '../../scripts/adsense-ownership.mjs'
const original=document.head.innerHTML
const production={mode:'production' as const,approvedOrigin:'https://www.v7luck.com'}
afterEach(()=>{document.head.innerHTML=original;document.body.innerHTML=''})
test('首页接管不重复标记，普通页/敏感页/preview接管清除旧标记',()=>{
 const head=createPageHead(getPage('home'),production)
 applyPageHead(document,head);document.head.append(document.querySelector('meta[name=google-adsense-account]')!.cloneNode(true))
 applyPageHead(document,head)
 expect(document.querySelectorAll('meta[name=google-adsense-account]')).toHaveLength(1)
 for(const name of ['office','file-diff','totp'] as const){applyPageHead(document,createPageHead(getPage(name),production));expect(document.querySelectorAll('meta[name=google-adsense-account]')).toHaveLength(0)}
 applyPageHead(document,head);applyPageHead(document,createPageHead(getPage('home'),{mode:'preview'}))
 expect(document.querySelectorAll('meta[name=google-adsense-account]')).toHaveLength(0)
})
test('审计拒绝错ID、重复、body标记、敏感页标记、广告脚本及广告位',()=>{
 const tag='<meta name="google-adsense-account" content="ca-pub-2420716265318225">'
 const loader='<script id="workdev-adsense" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2420716265318225" crossorigin="anonymous"></script>'
 document.head.innerHTML=tag+loader
 expect(()=>validateAdSenseDocument(document,{mode:'production',isHome:true})).not.toThrow()
 for(const bad of ['',tag+tag,tag.replace('2420716265318225','0000000000000000')]){
  document.head.innerHTML=bad;expect(()=>validateAdSenseDocument(document,{mode:'production',isHome:true})).toThrow()
 }
 document.head.innerHTML=tag
 for(const mode of ['preview','production'])expect(()=>validateAdSenseDocument(document,{mode,isHome:false})).toThrow()
 document.head.innerHTML='';document.body.innerHTML=tag
 expect(()=>validateAdSenseDocument(document,{mode:'production',isHome:true})).toThrow()
 document.body.innerHTML='';document.head.innerHTML=tag+'<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>'
 expect(()=>validateAdSenseDocument(document,{mode:'production',isHome:true})).toThrow()
 document.head.innerHTML=tag;document.body.innerHTML='<ins class="adsbygoogle"></ins>'
 expect(()=>validateAdSenseDocument(document,{mode:'production',isHome:true})).toThrow()
})

test('客户端接管保留单个已执行加载器，广告组内导航不重复插入',()=>{
 const home=createPageHead(getPage('home'),production)
 applyPageHead(document,home)
 const loader=document.querySelector('script#workdev-adsense')
 expect(loader?.getAttribute('crossorigin')).toBe('anonymous')
 expect(loader?.hasAttribute('async')).toBe(true)
 applyPageHead(document,home);expect(document.querySelector('script#workdev-adsense')).toBe(loader)
 applyPageHead(document,createPageHead(getPage('office'),production));expect(document.querySelector('script#workdev-adsense')).toBe(loader)
 expect(()=>validateAdSenseDocument(document,{mode:'production',isHome:false,pagePath:'/office/'})).not.toThrow()
 document.head.append(loader!.cloneNode(true))
 expect(()=>validateAdSenseDocument(document,{mode:'production',isHome:false,pagePath:'/office/'})).toThrow()
 applyPageHead(document,createPageHead(getPage('file-diff'),production))
 expect(document.querySelectorAll('script#workdev-adsense')).toHaveLength(0)
})
