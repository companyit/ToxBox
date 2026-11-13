import { test, expect, hydrated } from './helpers'
for (const width of [320,375,768,1440]) {
 test(`UI038 展示文案、布局与搜索 ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900})
  for(const path of ['/','/office/','/developer/','/about/','/terms/','/developer/base64/']) {
   await page.goto(path); await hydrated(page)
   await expect(page.locator('main')).not.toContainText('试用')
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   if(path==='/') {
    await expect(page.locator('.tool-card a')).toHaveCount(20)
    await expect(page.getByRole('navigation',{name:'工具分类快捷入口'}).getByRole('link')).toHaveCount(2)
    await page.getByLabel('搜索工具',{exact:true}).fill('Base64')
    await expect(page.locator('.tool-card')).toHaveCount(1)
    await expect(page.getByRole('navigation',{name:'工具分类快捷入口'}).getByRole('link')).toHaveCount(1)
    await page.getByRole('button',{name:'清除搜索',exact:true}).click()
    await expect(page.getByLabel('搜索工具',{exact:true})).toBeFocused()
    await expect(page.locator('.tool-card')).toHaveCount(20)
   }
   if(path==='/' || path==='/office/')await page.screenshot({path:info.outputPath(`polish-${path==='/'?'home':'office'}-${width}.png`),fullPage:true})
  }
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'})
  await page.goto('/');await hydrated(page)
  await page.screenshot({path:info.outputPath(`polish-dark-${width}.png`),fullPage:true})
 })
}
