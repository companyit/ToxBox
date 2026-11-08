import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { JSDOM } from 'jsdom'
import { chromium, webkit } from '@playwright/test'
import { buildCandidate, verifyCandidate, createSeoEnvelope, repositoryRoot } from '../../scripts/release-candidate.mjs'
import { validateCandidateOutput } from '../../scripts/ssg.mjs'
import { pages, notFoundPage } from '../../src/data/pages.ts'
import { createPageHead } from '../../src/utils/seo.ts'
const id='seo-'+Date.now()
const origin='http://127.0.0.1:4177'
function readHead(doc = document) {
 return {title:doc.title,description:doc.querySelector('meta[name=description]')?.content,robots:doc.querySelector('meta[name=robots]')?.content,canonical:doc.querySelector('link[rel=canonical]')?.getAttribute('href'),schema:[...doc.querySelectorAll('script[type="application/ld+json"]')].map(n=>JSON.parse(n.textContent))}
}
test('SEO生产24页索引、结构化数据负向校验与双引擎SSR/hydration一致',async t=>{
 const candidate=await buildCandidate({candidateId:id,mode:'production',origin:'https://www.v7luck.com'})
 const verified=await verifyCandidate(candidate.receipt,candidate.receiptSha256)
 const envelope=await createSeoEnvelope({mode:'production',origin:'https://www.v7luck.com'})
 const dir=path.dirname(path.resolve(candidate.receipt)),output=path.join(dir,'output/dist-ssg'),manifest=path.join(dir,'metadata/ssr-manifest.json')
 const evidence=path.join(repositoryRoot,'docs/verification/evidence/seo-growth',id);await fs.mkdir(evidence,{recursive:true})
 await fs.writeFile(path.join(evidence,'candidate.json'),JSON.stringify(candidate,null,2))
 const checked=[]
 for(const p of [...pages,notFoundPage]){
  const file=p===notFoundPage?'404.html':p.path.slice(1)+'index.html',dom=new JSDOM(await fs.readFile(path.join(output,file),'utf8'))
  const actual=readHead(dom.window.document),expected=createPageHead(p,{mode:'production',approvedOrigin:'https://www.v7luck.com'})
  assert.equal(actual.title,expected.title);assert.equal(actual.robots,expected.robots);assert.equal(actual.canonical,expected.canonical);assert.deepEqual(actual.schema,expected.structuredData?[expected.structuredData]:[])
  checked.push({path:p.path||'/__missing__/',...actual});dom.window.close()
 }
 assert.equal(checked.filter(p=>p.canonical).length,24);assert.equal(checked.filter(p=>!p.canonical).length,4)
 await t.test('拒绝重复schema、错误canonical和sitemap缺项',async()=>{
  const copy=path.join(dir,'semantic-negative');await fs.cp(output,copy,{recursive:true,errorOnExist:true})
  const file=path.join(copy,'office/image-crop/index.html'),original=await fs.readFile(file,'utf8')
  const script=original.match(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/)[0]
  await fs.writeFile(file,original.replace('</head>',script+'</head>'));await assert.rejects(validateCandidateOutput(copy,envelope,manifest),/结构化数据/)
  await fs.writeFile(file,original.replace('href="https://www.v7luck.com/office/image-crop/"','href="https://www.v7luck.com/office/"'));await assert.rejects(validateCandidateOutput(copy,envelope,manifest),/SEO标签/)
  await fs.writeFile(file,original);const sitemap=path.join(copy,'sitemap.xml'),xml=await fs.readFile(sitemap,'utf8');await fs.writeFile(sitemap,xml.replace(/\s*<url><loc>[^<]*<\/loc><\/url>/,''));await assert.rejects(validateCandidateOutput(copy,envelope,manifest),/sitemap/)
 })
 const child=spawn(process.execPath,['scripts/release-candidate.mjs','preview','--receipt',candidate.receipt,'--expected-sha',candidate.receiptSha256],{cwd:repositoryRoot,stdio:['ignore','pipe','pipe']})
 let serverLog='';child.stdout.on('data',d=>serverLog+=d);child.stderr.on('data',d=>serverLog+=d);const exit=once(child,'exit')
 const browsers=[]
 try{
  let ready=false
  for(let attempt=0;attempt<200;attempt++){if(child.exitCode!==null)throw Error(serverLog);try{ready=(await fetch(origin+'/')).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100))}
  assert(ready,'生产隔离预览未就绪')
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
   await t.test(name+'：28页原始head与hydration及导航清理',async()=>{
    const browser=await engine.launch();try{
     const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[],external=[]
     await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();external.push(route.request().url());return route.abort()})
     page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/hydration.*mismatch/i.test(m.text()))errors.push('hydration mismatch')})
     for(const definition of checked){
      const response=await page.goto(origin+definition.path);assert.equal(response.status(),definition.path==='/__missing__/'?404:200)
      await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.__vue_app__))
      const hydrated=await page.evaluate(readHead)
      const {path: _path,...expectedHead}=definition
      assert.deepEqual(JSON.parse(JSON.stringify(hydrated)),JSON.parse(JSON.stringify(expectedHead)),definition.path)
      assert.equal(await page.locator('script[data-workdev-structured-data]').count(),definition.schema.length)
     }
     await page.goto(origin+'/developer/json-formatter/');await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.__vue_app__))
     await page.locator('.breadcrumbs a[href="/developer/"]').click();await page.waitForURL(origin+'/developer/');assert.equal((await page.evaluate(readHead)).schema[0].itemListElement.length,2)
     await page.goto(origin+'/');await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.__vue_app__));await page.screenshot({path:path.join(evidence,name+'-home.png'),fullPage:true})
     const noJS=await browser.newContext({javaScriptEnabled:false}),staticPage=await noJS.newPage();await staticPage.goto(origin+'/office/image-crop/');assert.equal(await staticPage.locator('h1').textContent(),'图片尺寸与裁剪');assert.equal(await staticPage.locator('script[type="application/ld+json"]').count(),1);await noJS.close()
     assert.deepEqual(errors,[]);assert.deepEqual(external,[]);browsers.push({name,version:browser.version(),pages:checked.length,errors,external});await context.close()
    }finally{await browser.close()}
   })
  }
 }finally{child.kill('SIGTERM');await exit;await fs.writeFile(path.join(evidence,'server.log'),serverLog)}
 await verifyCandidate(candidate.receipt,candidate.receiptSha256)
 await fs.writeFile(path.join(evidence,'results.json'),JSON.stringify({candidate,heads:checked,browsers,publicFiles:Object.keys(verified.receipt.output.files).length},null,2));console.log('SEO_PRODUCTION_EVIDENCE '+path.relative(repositoryRoot,evidence))
})
