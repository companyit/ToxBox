import { test, expect, hydrated, origin } from './helpers'
const legacyCases = [
 ['text-statistics','/office/text-statistics/'],['text-cleanup','/office/text-cleanup/'],['csv-json','/office/csv-json/'],['pdf-merge','/office/pdf-merge/'],['pdf-split','/office/pdf-split/'],['word-to-pdf','/office/word-to-pdf/'],['images-to-pdf','/office/images-to-pdf/'],['date-calculator','/office/date-calculator/'],
 ['json-formatter','/developer/json-formatter/'],['url-encoder','/developer/url-encoder/'],['totp','/developer/2fa/'],['base64','/developer/base64/'],['timestamp','/developer/timestamp/'],['uuid','/developer/uuid/'],
] as const
for(const width of [375,768,1440])test(`HOME 清理重复区域且保留普通入口 ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await hydrated(page)
 await expect(page.getByRole('heading',{name:'工具入口已迁移',exact:true})).toHaveCount(0);await expect(page.locator('.migration-section, .migration-entry')).toHaveCount(0)
 await expect(page.locator('.tool-card a')).toHaveCount(19);await expect(page.getByRole('link',{name:'查看完整隐私说明',exact:true})).toHaveCount(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath(`home-clean-${width}.png`),fullPage:true})
})
test('HOME 全14旧工具书签精确跳转，清理query/hash并使用目标SSG',async({page})=>{
 for(const [hash,path] of legacyCases){
  await page.goto('/?legacy_probe=synthetic#'+hash,{waitUntil:'commit'});await expect(page).toHaveURL(origin+path);await hydrated(page)
  await expect(page.locator('.tool-page h1')).toHaveCount(1);await expect(page.locator('#app')).toHaveAttribute('data-render-mode','ssg')
  if(['totp','pdf-merge','pdf-split','word-to-pdf','images-to-pdf'].includes(hash))await expect(page.locator('#workdev-google-tag')).toHaveCount(0)
 }
 await page.goto('/#%6Ason-formatter',{waitUntil:'commit'});await expect(page).toHaveURL(origin+'/developer/json-formatter/');await hydrated(page)
})
test('HOME 未知/畸形hash保留首页，分区锚点和非根路径不误转',async({page})=>{
 for(const hash of ['missing','%E4%BD','office-tools','developer-tools','privacy']){
  await page.goto('/#'+hash);await hydrated(page);expect(new URL(page.url()).pathname).toBe('/');expect(new URL(page.url()).hash).toBe('#'+hash)
  if(['office-tools','developer-tools','privacy'].includes(hash))await expect(page.locator('#'+hash)).toHaveCount(1)
 }
 await page.goto('/developer/base64/#totp');await hydrated(page);await expect(page).toHaveURL(origin+'/developer/base64/#totp')
})
test('HOME 已挂载后旧hash也整页替换，敏感页不继承文档，返回不落回旧hash',async({page})=>{
 await page.goto('/developer/base64/');await hydrated(page)
 await page.getByRole('link',{name:'首页',exact:true}).first().click();await expect(page).toHaveURL(origin+'/');await expect(page.locator('h1')).toHaveText('让日常工作，轻松一点。');await hydrated(page)
 await page.evaluate(()=>{Reflect.set(window,'legacyDocumentProbe','public');location.hash='totp'})
 await expect(page).toHaveURL(origin+'/developer/2fa/');await expect(page.getByLabel('Base32 密钥',{exact:true})).toBeEnabled()
 expect(await page.evaluate(()=>Reflect.get(window,'legacyDocumentProbe'))).toBeUndefined()
 await page.goBack();await expect(page).toHaveURL(origin+'/');await expect(page.getByLabel('搜索工具',{exact:true})).toBeEnabled()
 expect(new URL(page.url()).hash).toBe('')
 await page.goBack();await expect(page).toHaveURL(origin+'/developer/base64/');await expect(page.locator('.hydration-controls')).toBeEnabled()
})
