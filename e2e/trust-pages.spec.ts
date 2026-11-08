import { test, expect, hydrated, origin } from './helpers'
for (const width of [375,768,1440]) {
 test(`信任页面、页脚与指南 ${width}`, async({page})=>{
  await page.setViewportSize({width,height:900})
  for(const [route,heading] of [['about','关于顺手集'],['contact','联系我们'],['privacy','隐私政策'],['terms','服务条款']]) {
   await page.goto(`/${route}/`); await hydrated(page)
   await expect(page.getByRole('heading',{level:1})).toHaveText(heading!)
   for(const [name,path] of [['关于我们','about'],['联系我们','contact'],['隐私政策','privacy'],['服务条款','terms']]) {
    const link=page.getByRole('navigation',{name:'页脚导航'}).getByRole('link',{name:name!,exact:true})
    await expect(link).toHaveAttribute('href',`/${path}/`)
   }
   await expect(page.locator('script[src*="pagead2.googlesyndication.com"], ins.adsbygoogle')).toHaveCount(0)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
  const email=page.getByRole('link',{name:'联系我们',exact:true}).last()
  await email.click(); await expect(page).toHaveURL(origin+'/contact/')
  await expect(page.getByRole('link',{name:'huangjemdev@gmail.com',exact:true})).toHaveAttribute('href','mailto:huangjemdev@gmail.com')
  await expect(page.locator('form')).toHaveCount(0)
  await page.goto('/developer/base64/'); await hydrated(page)
  await expect(page.getByRole('heading',{name:'使用指南',exact:true})).toBeVisible()
  await expect(page.locator('.tool-guide h4')).toHaveCount(2)
 })
}
test('四页页脚入口可键盘聚焦并打开',async({page})=>{
 await page.goto('/'); await hydrated(page)
 const link=page.getByRole('navigation',{name:'页脚导航'}).getByRole('link',{name:'联系我们',exact:true})
 await link.focus(); await expect(link).toBeFocused(); await page.keyboard.press('Enter')
 await expect(page).toHaveURL(origin+'/contact/')
})
