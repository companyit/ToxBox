import {test,expect,hydrated} from './helpers'
import fs from 'node:fs/promises'
import JSZip from 'jszip'
for(const width of [375,768,1440])test(`CONVERT 真实图片三格式、体积、ZIP与失效 ${width}`,async({page,browserName},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/office/image-convert/');await hydrated(page)
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=40;c.getContext('2d')!.fillRect(0,0,40,20);return Array.from(Uint8Array.from(atob(c.toDataURL().split(',')[1]!),c=>c.charCodeAt(0)))})
 const picker=page.getByLabel('选择或追加图片',{exact:true})
 await picker.setInputFiles([{name:'PRIVATE-A.png',mimeType:'image/png',buffer:Buffer.from(png)},{name:'B.png',mimeType:'image/png',buffer:Buffer.from(png)}])
 await page.getByLabel('最长边（像素）',{exact:true}).fill('40')
 for(const format of ['png','jpeg','webp']){
  await page.getByLabel('输出格式',{exact:true}).selectOption(format)
  await expect(page.locator('a[download]')).toHaveCount(0)
  if(format==='png')await expect(page.getByLabel('质量（10～100）',{exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'开始处理',exact:true}).click()
  if(format==='webp' && browserName==='webkit'){await expect(page.getByRole('status')).toContainText('不支持所选格式');await expect(page.locator('a[download]')).toHaveCount(0);continue}
  await expect(page.getByRole('status')).toContainText('处理完成')
  const rows=page.locator('.convert-results li');await expect(rows).toHaveCount(2);await expect(rows.first()).toContainText('40 × 20')
  const ext=format==='jpeg'?'jpg':format
  const event=page.waitForEvent('download');await page.getByRole('link',{name:'打包下载 ZIP',exact:true}).click();const download=await event
  const path=info.outputPath(`converted-${format}.zip`);await download.saveAs(path);const zip=await JSZip.loadAsync(await fs.readFile(path))
  expect(Object.keys(zip.files)).toEqual([`image-01.${ext}`,`image-02.${ext}`])
  const bytes=await zip.file(`image-01.${ext}`)!.async('uint8array')
  if(format==='png')expect([...bytes.slice(0,4)]).toEqual([137,80,78,71])
  if(format==='jpeg')expect([...bytes.slice(0,2)]).toEqual([255,216])
  if(format==='webp')expect(Buffer.from(bytes.slice(8,12)).toString()).toBe('WEBP')
  const pixel=await page.locator('.convert-results img').first().evaluate(async(el:HTMLImageElement)=>{await el.decode();const c=document.createElement('canvas');c.width=40;c.height=20;const x=c.getContext('2d')!;x.drawImage(el,0,0);return [...x.getImageData(35,15,1,1).data]})
  if(format==='jpeg'){expect(pixel[0]).toBeGreaterThan(240);expect(pixel[3]).toBe(255)}else expect(pixel[3]).toBe(0)
 }
 // WebP result is accepted as static input; output is numbered independently of original names.
 const resultBytes=Buffer.from('UklGRjYCAABXRUJQVlA4WAoAAAAwAAAAJwAAEwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZBTFBIGAAAAAEPMP8REYIw22gG86fd/04gov8TUMLYI1ZQOCAoAAAA8AIAnQEqKAAUAD5tNpdIpCMiISVoAIANiWkAAClDbfAA/vucwAAAAA==','base64')
 await page.getByRole('button',{name:'清空',exact:true}).click();await expect(picker).toBeFocused()
 await page.getByLabel('输出格式',{exact:true}).selectOption('png')
 await picker.setInputFiles({name:'input.webp',mimeType:'image/webp',buffer:Buffer.from(resultBytes)})
 await page.getByRole('button',{name:'开始处理',exact:true}).click();await expect(page.getByRole('status')).toContainText('处理完成')
 await picker.setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('PRIVATE-BROKEN')})
 await page.getByRole('button',{name:'开始处理',exact:true}).click();await expect(page.getByRole('status')).toContainText('损坏')
 await expect(page.getByRole('status')).not.toContainText('PRIVATE');await expect(page.locator('a[download]')).toHaveCount(0)
 await expect(page.locator('.selected-images li')).toHaveCount(2)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath(`convert-${width}.png`),fullPage:true})
})
test('CONVERT 本地隐私、参数校验、取消和pagehide清理',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()))
 await page.goto('/');await hydrated(page);await page.getByLabel('搜索工具',{exact:true}).fill('图片压缩')
 await page.getByRole('link',{name:'打开工具 ：图片压缩与格式转换',exact:true}).click();await expect(page).toHaveURL('/office/image-convert/');await hydrated(page)
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=10;c.height=10;return Array.from(Uint8Array.from(atob(c.toDataURL().split(',')[1]!),c=>c.charCodeAt(0)))})
 const picker=page.getByLabel('选择或追加图片',{exact:true});await picker.setInputFiles({name:'PRIVATE.png',mimeType:'image/png',buffer:Buffer.from(png)})
 await page.getByLabel('最长边（像素）',{exact:true}).fill('0');await page.getByRole('button',{name:'开始处理',exact:true}).click();await expect(page.getByRole('status')).toContainText('整数最长边')
 await expect(page.locator('.selected-images li')).toHaveCount(1)
 await page.getByLabel('最长边（像素）',{exact:true}).fill('1920')
 await page.evaluate(async()=>{(Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='开始处理') as HTMLButtonElement).click();await Promise.resolve();(Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='取消处理') as HTMLButtonElement).click()});await expect(page.getByRole('status')).toContainText('已取消');await expect(page.locator('a[download]')).toHaveCount(0)
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})))
 await expect(page.locator('.selected-images li')).toHaveCount(0)
 expect(requests.every(u=>!u.includes('PRIVATE')&&!/google|adsbygoogle/i.test(u))).toBe(true)
})
