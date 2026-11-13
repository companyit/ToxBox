import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {preview} from 'vite'
import {chromium,webkit} from '@playwright/test'
import {JSDOM} from 'jsdom'
import {digestDirectory,repositoryRoot} from '../../scripts/release-candidate.mjs'
import {verifyPackage} from '../../scripts/release-package.mjs'
import {createOrganizerFixture} from '../helpers/pdfOrganizerFixture.ts'
const origin='http://127.0.0.1:4177'
async function ready(child){for(let i=0;i<200;i++){if(child?.exitCode!==null&&child?.exitCode!==undefined)throw Error('预览进程提前退出');try{if((await fetch(origin+'/')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('预览未就绪')}
async function command(script,run){
 const child=spawn(process.platform==='win32'?'npm.cmd':'npm',['run',script,'--','--host','127.0.0.1','--port','4177','--strictPort'],{cwd:repositoryRoot,stdio:['ignore','pipe','pipe'],detached:true})
 const exit=once(child,'exit');let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d)
 try{await ready(child);return await run()}
 finally{try{process.kill(-child.pid,'SIGTERM')}catch(error){if(error.code!=='ESRCH')throw error}await exit}
}
async function hydrated(page){await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.__vue_app__))}
test('标准生产dist与预览目录一致，并可执行新增Worker功能',async t=>{
 const entries=await fs.readdir('.ci/handoff',{withFileTypes:true}),records=[]
 for(const entry of entries){if(!entry.isDirectory())continue;const file=path.join('.ci/handoff',entry.name,'handoff.json');try{records.push({record:JSON.parse(await fs.readFile(file,'utf8')),mtime:(await fs.stat(file)).mtimeMs})}catch(error){if(error.code!=='ENOENT')throw error}}
 records.sort((a,b)=>b.mtime-a.mtime);assert(records.length)
 const handoff=records[0].record
 assert.equal(handoff.dist,path.join(repositoryRoot,'dist'))
 await verifyPackage(handoff.packageId,handoff.manifestSha256)
 assert.deepEqual(await digestDirectory('dist'),await digestDirectory(handoff.site))
 const htmlFiles=Object.keys(await digestDirectory('dist')).filter(f=>f.endsWith('.html'));assert.equal(htmlFiles.length,28)
 const dom=new JSDOM(await fs.readFile('dist/index.html','utf8'));assert.equal(dom.window.document.querySelectorAll('.tool-card a').length,20);assert.equal(dom.window.document.querySelector('meta[name=robots]').content,'index,follow');dom.window.close()
 const evidence=path.join('docs/verification/evidence/build-entry',handoff.packageId);await fs.mkdir(evidence,{recursive:true})
 const results=[]
 await command('preview',async()=>{
  assert.equal(await(await fetch(origin+'/')).text(),await fs.readFile('dist/index.html','utf8'))
  const redirect=await fetch(origin+'/office/image-crop',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/office/image-crop/')
  assert.equal((await fetch(origin+'/not-a-page/')).status,404)
  for(const file of ['robots.txt','sitemap.xml','third-party-notices.txt']){const response=await fetch(origin+'/'+file);assert.equal(response.status,200,file);assert.equal(await response.text(),await fs.readFile(path.join('dist',file),'utf8'))}
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
   await t.test(name+'：默认preview真实裁剪、PDF整理、JSON/YAML',async()=>{
    const browser=await engine.launch();try{
     const context=await browser.newContext(),page=await context.newPage(),errors=[],external=[]
     await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/')||route.request().url().startsWith('blob:'))return route.continue();external.push(route.request().url());return route.abort()})
     page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/hydration.*mismatch/i.test(m.text()))errors.push('hydration mismatch')})
     await page.goto(origin+'/office/image-crop/');await hydrated(page)
     const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=40;c.getContext('2d').fillRect(0,0,40,20);return Array.from(Uint8Array.from(atob(c.toDataURL().split(',')[1]),s=>s.charCodeAt(0)))})
     await page.getByLabel('选择待裁剪图片',{exact:true}).setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png)})
     await page.getByRole('status').filter({hasText:'图片已就绪'}).waitFor();await page.getByLabel('裁剪宽度',{exact:true}).fill('40');await page.getByLabel('裁剪高度',{exact:true}).fill('20');await page.getByRole('button',{name:'生成裁剪图片',exact:true}).click();await page.getByRole('status').filter({hasText:'生成完成'}).waitFor();assert.equal(await page.getByAltText('裁剪结果预览',{exact:true}).evaluate(async img=>{await img.decode();return img.naturalWidth}),40)
     const download=page.waitForEvent('download');await page.getByRole('link',{name:'下载裁剪图片',exact:true}).click();await(await download).saveAs(path.join(evidence,name+'-cropped.png'))
     await page.goto(origin+'/office/pdf-organizer/');await hydrated(page);await page.getByLabel('选择待整理的 PDF',{exact:true}).setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(await createOrganizerFixture())});await page.locator('[data-page="0"] img').waitFor();await page.getByRole('button',{name:'导出整理后的 PDF',exact:true}).click();await page.getByRole('link',{name:'下载 organized.pdf',exact:true}).waitFor()
     await page.goto(origin+'/developer/json-yaml/');await hydrated(page);await page.getByLabel('待转换的 JSON 或 YAML',{exact:true}).fill('{"name":"工具","enabled":true}');await page.getByRole('button',{name:'转换格式',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#table-result').value.includes('工具'));assert.match(await page.getByLabel('转换结果（只读）',{exact:true}).inputValue(),/enabled: true/)
     assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.v7luck.com/developer/json-yaml/')
     assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({browser:name,version:browser.version(),crop:true,pdfOrganizer:true,jsonYaml:true,errors,external});await context.close()
    }finally{await browser.close()}
   })
  }
 })
 await t.test('显式noindex预览仍读取dist-ssg',async()=>{
  await command('preview:local',async()=>{const html=await(await fetch(origin+'/')).text();assert.equal(html,await fs.readFile('dist-ssg/index.html','utf8'));const doc=new JSDOM(html);assert.equal(doc.window.document.querySelector('meta[name=robots]').content,'noindex,follow');assert.equal(doc.window.document.querySelectorAll('link[rel=canonical]').length,0);doc.window.close()})
 })
 await t.test('自定义outDir的HTML、308、404与资源不串目录',async()=>{
  const custom=await fs.mkdtemp(path.join(repositoryRoot,'.ci/build-entry-custom-'));await fs.mkdir(path.join(custom,'office/sample'),{recursive:true});await fs.mkdir(path.join(custom,'assets'));await fs.writeFile(path.join(custom,'index.html'),'<h1>custom-root</h1>');await fs.writeFile(path.join(custom,'office/sample/index.html'),'<h1>custom-tool</h1>');await fs.writeFile(path.join(custom,'404.html'),'<h1>custom-404</h1>');await fs.writeFile(path.join(custom,'assets/probe.js'),'export default 37')
  const server=await preview({configLoader:'native',build:{outDir:custom},preview:{host:'127.0.0.1',port:4177,strictPort:true}})
  try{assert.equal(await(await fetch(origin+'/')).text(),'<h1>custom-root</h1>');assert.equal(await(await fetch(origin+'/office/sample/')).text(),'<h1>custom-tool</h1>');assert.equal((await fetch(origin+'/office/sample',{redirect:'manual'})).status,308);const missing=await fetch(origin+'/missing/');assert.equal(missing.status,404);assert.equal(await missing.text(),'<h1>custom-404</h1>');assert.equal(await(await fetch(origin+'/assets/probe.js')).text(),'export default 37');assert.equal((await fetch(origin+'/package.json')).status,404)}finally{await server.close()}
 })
 await fs.writeFile(path.join(evidence,'results.json'),JSON.stringify({handoff,html:htmlFiles.length,tools:20,results,distMatchesPackage:true},null,2));console.log('BUILD_ENTRY_EVIDENCE '+evidence)
})
