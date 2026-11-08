import { test, expect, hydrated } from './helpers'
for(const width of [375,768,1440]) test(`DATE 双模式、键盘、校验、复制失败和清理 ${width}`,async({page,browserName},info)=>{
 await page.setViewportSize({width,height:900})
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error())}}))
 await page.goto('/office/date-calculator/');await hydrated(page)
 const start=page.getByLabel('开始日期',{exact:true}),end=page.getByLabel('结束日期',{exact:true}),result=page.getByLabel('日期计算结果（只读）',{exact:true}),run=page.getByRole('button',{name:'计算日期',exact:true})
 await start.fill('2024-02-28');await end.fill('2024-03-01')
 await end.dispatchEvent('compositionstart');await expect(run).toBeDisabled();await end.dispatchEvent('compositionend')
 await end.focus();await page.keyboard.press(browserName==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab');await expect(run).toBeFocused();await page.keyboard.press('Enter');await expect(result).toHaveValue('2 天')
 await page.getByRole('button',{name:'复制结果',exact:true}).click();await expect(page.locator('#date-status')).toContainText('手动复制');await expect(result).toBeFocused()
 await page.getByRole('button',{name:'填入示例',exact:true}).click();await expect(start).toHaveValue('2024-02-28')
 await page.getByLabel('计算模式').selectOption('offset');await expect(result).toHaveValue('')
 await page.getByLabel('基准日期').fill('2024-03-01');await page.getByLabel('加减天数').fill('-1');await run.click();await expect(result).toHaveValue('2024-02-29')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await info.attach(`date-${width}`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'})
 await page.getByLabel('加减天数').fill('+1');await run.click();await expect(result).toHaveValue('');await expect(page.getByLabel('加减天数')).toHaveValue('+1')
 await page.getByRole('button',{name:'清空',exact:true}).click();await expect(start).toBeFocused();await start.fill('2024-01-01X');await end.fill('2024-01-01');await run.click();await expect(start).toHaveValue('2024-01-01X');await expect(page.locator('#date-status')).toContainText('真实公历')
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect(start).toHaveValue('')
 await page.reload();await hydrated(page);await expect(start).toHaveValue('')
 await expect(page.locator('.site-header nav a[href="/office/"]')).toHaveAttribute('aria-current','page')
})
for(const timezoneId of ['UTC','America/Los_Angeles','Asia/Shanghai'])test(`DATE 时区无关 ${timezoneId}`,async({browser})=>{
 const context=await browser.newContext({timezoneId});const page=await context.newPage()
 try {
  await page.goto('http://127.0.0.1:4177/office/date-calculator/');await hydrated(page)
  await page.getByLabel('开始日期',{exact:true}).fill('2024-03-09');await page.getByLabel('结束日期',{exact:true}).fill('2024-03-11');await page.getByRole('button',{name:'计算日期',exact:true}).click();await expect(page.locator('#date-result')).toHaveValue('2 天')
  await page.getByLabel('计算模式').selectOption('offset');await page.getByLabel('基准日期').fill('0001-01-01');await page.getByLabel('加减天数').fill('3652058');await page.getByRole('button',{name:'计算日期',exact:true}).click();await expect(page.locator('#date-result')).toHaveValue('9999-12-31')
 }finally{await context.close()}
})
test('DATE 首页搜索及办公分类接入',async({page})=>{
 await page.goto('/');await hydrated(page);await page.getByLabel('搜索工具',{exact:true}).fill('日期差');await expect(page.locator('.tool-grid li')).toHaveCount(1)
 await page.getByRole('link',{name:'试用工具 ：日期差与日期加减',exact:true}).click();await hydrated(page);await expect(page.locator('h1')).toHaveText('日期差与日期加减')
})
