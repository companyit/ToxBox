// 从仓库根执行；先使用 release-candidate.mjs preview 启动已校验候选。
import { chromium, webkit } from '@playwright/test'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pages } from '../../../../src/data/pages.ts'
const origin = 'http://127.0.0.1:4177'
const summary = { mode:'production', browsers:[], checkedPages:0, screenshots:[], mismatch:[], pageErrors:[], externalRequests:[] }
for (const engine of [chromium,webkit]) {
 const browser = await engine.launch()
 try {
  summary.browsers.push({engine:engine.name(),version:browser.version()})
  const context = await browser.newContext()
  await context.route('**/*',async route=>{
   if(new URL(route.request().url()).origin === origin) return route.continue()
   summary.externalRequests.push(new URL(route.request().url()).origin)
   return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror',e=>summary.pageErrors.push(e.message))
  page.on('console',message=>{if(/hydration|hydrate/i.test(message.text()) && /mismatch/i.test(message.text()))summary.mismatch.push(message.text())})
  for(const width of [375,768,1440]) {
   await page.setViewportSize({width,height:900})
   for(const definition of pages) {
    const response=await page.goto(origin+definition.path)
    assert.equal(response.status(),200)
    await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.__vue_app__))
    assert.equal(await page.title(),definition.title)
    assert.equal(await page.locator('h1').count(),1)
    assert.equal(await page.locator('link[rel="canonical"]').count(),definition.indexable?1:0)
    if(definition.indexable) assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://www.v7luck.com'+definition.path)
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),definition.indexable?'index,follow':'noindex,follow')
    for(const path of ['/about/','/contact/','/privacy/','/terms/']) assert.equal(await page.locator(`footer a[href="${path}"]`).count(),1)
    assert.equal(await page.locator('script[src*="pagead2.googlesyndication.com"], ins.adsbygoogle').count(),0)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    summary.checkedPages++
   }
  }
  for(const path of ['/missing-production-check/','/office/missing-production-check/']) {
   assert.equal((await page.goto(origin+path)).status(),404)
   assert.equal(await page.locator('link[rel="canonical"]').count(),0)
  }
  const redirect=await context.request.get(origin+'/contact',{maxRedirects:0})
  assert.equal(redirect.status(),308)
  assert.equal(redirect.headers().location,'/contact/')
  const sitemapResponse=await context.request.get(origin+'/sitemap.xml')
  assert.equal(sitemapResponse.status(),200)
  const sitemap=await sitemapResponse.text()
  assert.equal((sitemap.match(/<loc>/g)||[]).length,8)
  assert(!sitemap.includes('/contact/') && !sitemap.includes('/developer/2fa/'))
  assert.equal((await context.request.get(origin+'/robots.txt')).status(),200)
  await page.goto(origin+'/developer/base64/')
  await page.getByLabel('输入文本或 Base64',{exact:true}).fill('你好')
  await page.getByRole('button',{name:'转换',exact:true}).click()
  assert.equal(await page.getByLabel('处理结果（只读）',{exact:true}).inputValue(),'5L2g5aW9')
  await page.getByRole('navigation',{name:'页脚导航'}).getByRole('link',{name:'联系我们',exact:true}).click()
  await page.waitForURL(origin+'/contact/')
  assert.equal(await page.getByRole('link',{name:'huangjemdev@gmail.com',exact:true}).getAttribute('href'),'mailto:huangjemdev@gmail.com')
  await page.goBack(); await page.waitForURL(origin+'/developer/base64/')
  assert.equal(await page.getByLabel('输入文本或 Base64',{exact:true}).inputValue(),'')
  const staticContext=await browser.newContext({javaScriptEnabled:false})
  const staticPage=await staticContext.newPage()
  for(const path of ['/about/','/contact/','/privacy/','/terms/','/developer/base64/']) {
   assert.equal((await staticPage.goto(origin+path)).status(),200)
   assert((await staticPage.locator('main').innerText()).length>150)
  }
  await staticContext.close()
  await context.close()
 } finally { await browser.close() }
}
assert.deepEqual(summary.mismatch,[])
assert.deepEqual(summary.pageErrors,[])
assert.deepEqual(summary.externalRequests,[])
await fs.writeFile(new URL('./release-browser-results.json',import.meta.url),JSON.stringify(summary,null,2)+'\n')
console.log(JSON.stringify(summary,null,2))
