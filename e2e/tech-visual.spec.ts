import { test, expect, hydrated } from './helpers'
for(const theme of ['light','dark'] as const)for(const width of [375,1440]) {
 test(`VIS039 ${theme} ${width}`,async({page},info)=>{
  await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'})
  await page.setViewportSize({width,height:1000})
  await page.goto('/');await hydrated(page)
  await expect(page.locator('.tool-icon[aria-hidden="true"] svg')).toHaveCount(20)
  await expect(page.locator('.tool-card')).toHaveCount(20)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const contrasts=await page.evaluate(()=>{
   const root=getComputedStyle(document.documentElement)
   const luminance=(hex:string)=>{
    const value=hex.trim().replace('#','')
    const full=value.length===3?Array.from(value,c=>c+c).join(''):value
    const parts=full.match(/.{2}/g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4)
    return .2126*parts[0]!+.7152*parts[1]!+.0722*parts[2]!
   }
   const contrast=(a:string,b:string)=>{const x=luminance(root.getPropertyValue(a)),y=luminance(root.getPropertyValue(b));return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
   return [contrast('--color-text','--color-background'),contrast('--color-muted','--color-surface'),contrast('--color-accent','--color-accent-soft'),contrast('--color-on-accent','--color-accent')]
  })
  for(const ratio of contrasts)expect(ratio).toBeGreaterThanOrEqual(4.5)
  const link=page.locator('.tool-card a').first()
  await link.focus();await expect(link).toBeFocused()
  expect(await link.evaluate(node=>getComputedStyle(node).outlineStyle)).not.toBe('none')
  await page.getByLabel('搜索工具',{exact:true}).fill('Base64')
  await expect(page.locator('.tool-card')).toHaveCount(1)
  await page.getByRole('button',{name:'清除搜索',exact:true}).click()
  await expect(page.locator('.tool-card')).toHaveCount(20)
  await page.getByLabel('搜索工具',{exact:true}).blur()
  await page.screenshot({path:info.outputPath(`tech-${theme}-${width}-viewport.png`)})
  await page.screenshot({path:info.outputPath(`tech-${theme}-${width}-full.png`),fullPage:true})
 })
}
