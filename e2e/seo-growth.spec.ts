import {test,expect,hydrated} from './helpers'
for(const width of [375,1440])test(`SEO 站内推广顺序与搜索保留、分类和preview隔离 ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await hydrated(page)
 await expect(page.locator('.hero-description')).toContainText('PDF、图片、文本与开发工具')
 expect(await page.locator('.office .tool-card h3').allTextContents()).toEqual(['图片压缩与格式转换','PDF 合并','PDF 拆分与选页导出','图片转 PDF','图片尺寸与裁剪','PDF 页面整理','文本统计','文本整理','文本差异对比','CSV 与 JSON 表格互转','日期差与日期加减','文本处理工作台','Word 转 PDF'])
 expect((await page.locator('.developer .tool-card h3').allTextContents()).slice(0,3)).toEqual(['JSON 格式化与校验','时间戳转换','Base64 编解码'])
 await page.getByLabel('搜索工具',{exact:true}).fill('PDF');expect(await page.locator('.tool-card h3').allTextContents()).toEqual(['PDF 合并','PDF 拆分与选页导出','图片转 PDF','PDF 页面整理','Word 转 PDF'])
 await expect(page).toHaveURL('http://127.0.0.1:4177/')
 await page.getByRole('button',{name:'清除搜索',exact:true}).click();await page.getByRole('link',{name:'办公工具',exact:true}).first().click();await expect(page).toHaveURL('/office/');await hydrated(page)
 await expect(page.locator('.category-grid .tool-card h3').first()).toHaveText('图片压缩与格式转换');await expect(page.locator('.page-heading p')).toContainText('PDF合并')
 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex,follow');await expect(page.locator('script[type="application/ld+json"],link[rel=canonical]')).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
