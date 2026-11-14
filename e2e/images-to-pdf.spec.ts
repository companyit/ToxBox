import { test, expect, hydrated } from './helpers'
import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs/promises'
import type { Page } from '@playwright/test'
async function fixtures(page: Page) {
 return page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=80;c.height=40;const x=c.getContext('2d')!
  for(const [color,a,b] of [['#ff0000',0,0],['#00ff00',40,0],['#0000ff',0,20],['#ffff00',40,20]] as const){x.fillStyle=color;x.fillRect(a,b,40,20)}
  const rawJpeg=Array.from(Uint8Array.from(atob(c.toDataURL('image/jpeg',1).split(',')[1]!),s=>s.charCodeAt(0)))
  // WebKit 自带 EXIF；先移除旧 EXIF，再插入单份确定方向，避免构造冲突元数据。
  const jpeg=rawJpeg.slice(0,2)
  let at=2
  while(at<rawJpeg.length){
   const marker=rawJpeg[at+1]!
   if(marker===0xda){jpeg.push(...rawJpeg.slice(at));break}
   const length=rawJpeg[at+2]!*256+rawJpeg[at+3]!,end=at+2+length
   if(!(marker===0xe1&&String.fromCharCode(...rawJpeg.slice(at+4,at+10))==='Exif\0\0'))jpeg.push(...rawJpeg.slice(at,end))
   at=end
  }
  const oriented=Array.from({length:8},(_,i)=>{
   const exif=[69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,i+1,0,0,0,0,0,0,0]
   return [255,216,255,225,0,exif.length+2,...exif,...jpeg.slice(2)]
  })
  x.clearRect(0,0,80,40);x.fillStyle='#ff0000';x.fillRect(0,0,40,20)
  const transparent=Array.from(Uint8Array.from(atob(c.toDataURL('image/png').split(',')[1]!),s=>s.charCodeAt(0)))
  return {oriented,transparent}
 })
}
const passed=(page:Page)=>expect(page.getByRole('status')).toContainText('检查通过')
async function download(page:Page,path:string){
 await page.getByRole('button',{name:'生成 PDF',exact:true}).click();await expect(page.getByRole('status')).toContainText('生成完成')
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'下载 images.pdf',exact:true}).click();const d=await event;await d.saveAs(path);return PDFDocument.load(await fs.readFile(path))
}
for(const width of [375,768,1440])test(`IMG 排序、参数、下载及白底 ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/office/images-to-pdf/');await hydrated(page)
 const data=await fixtures(page),input=page.getByLabel('选择或追加 JPG/PNG 图片',{exact:true})
 await input.setInputFiles([{name:'A.jpg',mimeType:'image/jpeg',buffer:Buffer.from(data.oriented[0]!)},{name:'B.png',mimeType:'image/png',buffer:Buffer.from(data.transparent)},{name:'C.jpg',mimeType:'image/jpeg',buffer:Buffer.from(data.oriented[5]!)}]);await passed(page)
 await page.getByRole('button',{name:'上移第 3 张图片',exact:true}).click();await page.getByRole('button',{name:'上移第 2 张图片',exact:true}).click();await expect(page.locator('.image-controls li').first()).toContainText('C.jpg')
 const path=info.outputPath('images.pdf'),doc=await download(page,path);expect(doc.getPageCount()).toBe(3)
 for(const p of doc.getPages()){expect(p.getWidth()).toBeCloseTo(210*72/25.4);expect(p.getHeight()).toBeCloseTo(297*72/25.4)}
 await page.getByLabel('A4 页面方向').selectOption('landscape');await expect(page.locator('a[download]')).toHaveCount(0);await page.getByLabel('页面边距').selectOption('20')
 const landscape=await download(page,info.outputPath('landscape.pdf'));expect(landscape.getPage(0).getWidth()).toBeCloseTo(297*72/25.4)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath(`images-${width}.png`),fullPage:true})
 await input.setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('PRIVATE_BAD_IMAGE')});await expect(page.getByRole('status')).toContainText('格式无效');await expect(page.locator('.image-controls li')).toHaveCount(3);await expect(page.locator('a[download]')).toHaveCount(0)
 await expect(page.getByRole('status')).not.toContainText('PRIVATE')
 await page.getByRole('button',{name:'清空',exact:true}).click();await expect(input).toBeFocused();await expect(page.locator('.image-controls li')).toHaveCount(0);await expect(page.getByLabel('页面边距')).toHaveValue('12')
})
test('IMG EXIF 1～8 实际 Worker 方向解码及透明白底输出',async({page},info)=>{
 await page.goto('/office/images-to-pdf/');await hydrated(page);const data=await fixtures(page)
 await page.getByLabel('选择或追加 JPG/PNG 图片',{exact:true}).setInputFiles([...data.oriented.map((b,i)=>({name:`orientation-${i+1}.jpg`,mimeType:'image/jpeg',buffer:Buffer.from(b)})),{name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(data.transparent)}]);await passed(page)
 const rows=page.locator('.image-controls li')
 for(let i=0;i<8;i++)await expect(rows.nth(i)).toContainText(i>=4?'40 × 80':'80 × 40')
 await page.getByLabel('页面边距').selectOption('0');const doc=await download(page,info.outputPath('orientations.pdf'));expect(doc.getPageCount()).toBe(9)
})
test('IMG 敏感文档导航、隐私、取消及离页清理',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()))
 await page.goto('/');await hydrated(page);await page.getByLabel('搜索工具',{exact:true}).fill('图片转 PDF')
 await Promise.all([page.waitForURL('http://127.0.0.1:4177/office/images-to-pdf/',{waitUntil:'load'}),page.getByRole('link',{name:'打开工具 ：图片转 PDF',exact:true}).click()]);await hydrated(page)
 await expect(page.locator('.site-header nav a[href="/office/"]')).toHaveAttribute('aria-current','page')
 const data=await fixtures(page),storage=await page.evaluate(()=>[JSON.stringify(localStorage),JSON.stringify(sessionStorage)])
 await page.getByLabel('选择或追加 JPG/PNG 图片',{exact:true}).setInputFiles({name:'PRIVATE_IMAGE.png',mimeType:'image/png',buffer:Buffer.from(data.transparent)});await passed(page)
 await page.evaluate(async()=>{
  (Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='生成 PDF') as HTMLButtonElement).click()
  await Promise.resolve()
  ;(Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='取消处理') as HTMLButtonElement | undefined)?.click()
 })
 await expect(page.getByRole('status')).toContainText('已取消');await expect(page.locator('.image-controls li')).toHaveCount(1)
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect(page.locator('.image-controls li')).toHaveCount(0)
 expect(await page.evaluate(()=>[JSON.stringify(localStorage),JSON.stringify(sessionStorage)])).toEqual(storage);expect(requests.every(u=>!u.includes('PRIVATE_IMAGE')&&!/google|adsbygoogle/i.test(u))).toBe(true)
 await Promise.all([page.waitForURL('http://127.0.0.1:4177/',{waitUntil:'load'}),page.getByRole('link',{name:'首页',exact:true}).first().click()]);await hydrated(page)
})
