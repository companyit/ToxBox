// 公网站点只读验收；使用合成输入，阻断第三方请求，不发送统计或工具内容。
import { chromium, webkit } from '@playwright/test'
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { pages } from '../../../../src/data/pages.ts'
const origin = 'https://www.v7luck.com'
const summary = { mode:'production', browsers:[], checkedPages:0, screenshots:[], mismatch:[], pageErrors:[], blockedThirdPartyOrigins:[] }
for (const engine of [chromium,webkit]) {
 const browser = await engine.launch()
 try {
  summary.browsers.push({engine:engine.name(),version:browser.version()})
  const context = await browser.newContext()
  await context.route('**/*',async route=>{
   if(new URL(route.request().url()).origin === origin) return route.continue()
   summary.blockedThirdPartyOrigins.push(new URL(route.request().url()).origin)
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
  assert([301,308].includes(redirect.status()))
  assert.equal(new URL(redirect.headers().location,origin).href,origin+'/contact/')
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
  for(const [path,label,input,button,expected] of [
   ['/developer/json-formatter/','输入或粘贴 JSON','{"a":1}','压缩','{"a":1}'],
   ['/developer/url-encoder/','输入或粘贴文本','a b','编码','a%20b'],
   ['/developer/timestamp/','输入时间戳或日期','0','转换','1970-01-01 00:00:00.000'],
  ]) {
   await page.goto(origin+path)
   await page.getByLabel(label,{exact:true}).fill(input)
   await page.getByRole('button',{name:button,exact:true}).click()
   assert.equal(await page.getByLabel('处理结果（只读）',{exact:true}).inputValue(),expected)
  }
  await page.goto(origin+'/developer/uuid/')
  await page.getByRole('button',{name:'生成 UUID',exact:true}).click()
  assert.match(await page.getByLabel('处理结果（只读）',{exact:true}).inputValue(),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  await page.goto(origin+'/office/text-statistics/')
  await page.getByLabel('输入或粘贴文本',{exact:true}).fill('你好 world')
  assert.equal(await page.locator('dd').first().innerText(),'8')
  await page.clock.install({time:new Date(59000)})
  await page.goto(origin+'/developer/2fa/')
  await page.getByLabel('Base32 密钥',{exact:true}).fill('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  await page.getByRole('button',{name:'生成验证码',exact:true}).click()
  assert.equal(await page.locator('output').innerText(),'287082')
  assert.equal(await page.locator('#workdev-google-tag').count(),0)
  assert.equal(await page.evaluate(()=>typeof window.gtag),'undefined')
  await page.getByRole('button',{name:'清空',exact:true}).click()
  assert.equal(await page.getByLabel('Base32 密钥',{exact:true}).inputValue(),'')
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
assert(summary.blockedThirdPartyOrigins.every(value => ['https://www.googletagmanager.com','https://www.google-analytics.com'].includes(value)))
await fs.writeFile(new URL('./published-browser-results-2026-11-03.json',import.meta.url),JSON.stringify(summary,null,2)+'\n')
console.log(JSON.stringify(summary,null,2))
