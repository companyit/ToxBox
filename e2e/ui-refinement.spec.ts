import { test, expect, hydrated } from './helpers'
for (const theme of ['light','dark'] as const) for(const width of [375,768,1440]) {
 test(`UI2 精简首页、首屏与目录 ${theme} ${width}`,async({page},info)=>{
  await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:width===375?812:900})
  await page.goto('/');await hydrated(page)
  await expect(page.locator('.hero-overview')).toHaveCount(0);await expect(page.locator('.hero h1')).toHaveText('让日常工作，轻松一点。')
  const input=page.getByLabel('搜索工具',{exact:true}),box=await input.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThan(width===375?812:900)
  if(width===1440){const entry=await page.locator('.tool-card a').first().boundingBox();expect(entry!.y+entry!.height).toBeLessThan(900)}
  await expect(page.locator('.office .tool-card')).toHaveCount(12);await expect(page.locator('.developer .tool-card')).toHaveCount(7)
  for(const section of ['office','developer']){
   const grid=page.locator(`.${section} .tool-grid`),cards=grid.locator('.tool-card'),first=await cards.first().boundingBox()
   const columns=width<640?1:width<1024?2:3
   for(let i=1;i<columns;i++){const b=await cards.nth(i).boundingBox();expect(Math.abs(b!.y-first!.y)).toBeLessThan(1);expect(Math.abs(b!.height-first!.height)).toBeLessThan(1)}
  }
  for (const link of [page.locator('header nav a').first(), page.locator('.tool-card a').first()]) { await link.hover(); await expect(link).toHaveCSS('text-decoration-line','none') }
  await input.fill('PDF');await expect(page.locator('.tool-grid li')).toHaveCount(5)
  await page.getByRole('button',{name:'清除搜索',exact:true}).click();await expect(input).toBeFocused();await expect(page.locator('.tool-grid li')).toHaveCount(19)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const colors=await page.evaluate(()=>{
   const rgb=(s:string)=>s.match(/[\d.]+/g)!.slice(0,3).map(Number)
   const luminance=(s:string)=>rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i]!,0)
   const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
   const body=getComputedStyle(document.body),input=getComputedStyle(document.querySelector('#tool-search')!),card=getComputedStyle(document.querySelector('.tool-card')!),text=getComputedStyle(document.querySelector('.tool-card > p')!),link=getComputedStyle(document.querySelector('.tool-card a')!)
   return {body:contrast(body.color,body.backgroundColor),description:contrast(text.color,card.backgroundColor),link:contrast(link.color,card.backgroundColor),input:contrast(input.borderTopColor,input.backgroundColor),focus:contrast(input.outlineColor,input.backgroundColor)}
  })
  expect(colors.body).toBeGreaterThanOrEqual(4.5);expect(colors.description).toBeGreaterThanOrEqual(4.5);expect(colors.link).toBeGreaterThanOrEqual(4.5);expect(colors.input).toBeGreaterThanOrEqual(3);expect(colors.focus).toBeGreaterThanOrEqual(3)
  await info.attach('对比度',{body:JSON.stringify(colors),contentType:'application/json'})
  await input.blur();await page.screenshot({path:info.outputPath(`home-${theme}-${width}.png`),fullPage:true})
 })
 test(`UI2 共享工具层级与文件控件 ${theme} ${width}`,async({page},info)=>{
  await page.emulateMedia({colorScheme:theme});await page.setViewportSize({width,height:900})
  await page.goto('/office/images-to-pdf/');await hydrated(page)
  await expect(page.locator('.tool-guide')).toBeVisible();await expect(page.locator('.related-tools')).toHaveCount(0);await expect(page.locator('.tool-privacy a')).toBeVisible()
  const input=page.getByLabel('选择或追加 JPG/PNG 图片',{exact:true});await input.focus();await expect(input).toBeFocused();expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath(`tool-${theme}-${width}.png`),fullPage:true})
 })
}
test('UI2 长名称和200%字号重排，无截断或横向滚动',async({page})=>{
 await page.setViewportSize({width:320,height:900});await page.goto('/');await hydrated(page)
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.querySelector('.tool-card h3')!.textContent='用于验证自然换行的很长很长工具名称ABCDEFG1234567890'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const card=page.locator('.tool-card').first(),title=card.locator('h3'),entry=card.locator('a')
 expect((await entry.boundingBox())!.y).toBeGreaterThan((await title.boundingBox())!.y+(await title.boundingBox())!.height)
 await page.getByLabel('搜索工具',{exact:true}).fill('CSV');await expect(page.locator('.tool-grid li')).toHaveCount(1)
})

test('UI3 分类目录无重复底部入口，工具列表保留',async({page})=>{
 for (const [path,count] of [['/office/',12],['/developer/',7]] as const) {
  await page.goto(path);await hydrated(page)
  await expect(page.locator('.category-grid .tool-card')).toHaveCount(count)
  await expect(page.locator('.category-directory .related-tools')).toHaveCount(0)
 }
})

for (const width of [375,768,1440]) test(`UI4 顶部导航滚动常驻及返回首页 ${width}`,async({page})=>{
 await page.setViewportSize({width,height:812})
 await page.goto('/office/images-to-pdf/');await hydrated(page)
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight))
 const header=page.locator('.site-header')
 await expect.poll(async()=>Math.round((await header.boundingBox())!.y)).toBe(0)
 await expect(header.getByRole('link',{name:'顺手集 ToolHug，返回首页'})).toBeInViewport()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await header.getByRole('link',{name:'顺手集 ToolHug，返回首页'}).click()
 await expect(page).toHaveURL('/')
 await hydrated(page)
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight))
 await header.getByRole('link',{name:'办公工具',exact:true}).click()
 await expect(page).toHaveURL('/office/')
})

test('UI5 手机紧凑导航与卡片键盘反馈',async({page})=>{
 await page.setViewportSize({width:375,height:812});await page.goto('/');await hydrated(page)
 const brand=await page.locator('.site-header .brand').boundingBox()
 for (const link of await page.locator('.site-header nav a').all()) {
  const box=await link.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44)
  expect(Math.abs(box!.y-brand!.y)).toBeLessThan(2)
 }
 const entry=page.locator('.tool-card a').first();await entry.focus()
 await expect(entry).toBeFocused()
 const colors=await entry.evaluate(el=>({border:getComputedStyle(el.closest('.tool-card')!).borderTopColor,accent:getComputedStyle(el).getPropertyValue('--color-accent').trim()}))
 expect(colors.border).toBe('rgb(23, 99, 79)')
})
