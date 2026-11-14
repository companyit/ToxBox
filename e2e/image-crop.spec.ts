import { test, expect, hydrated } from './helpers'
import type { Page } from '@playwright/test'
import fs from 'node:fs/promises'
import { updateCrc32, finishCrc32 } from '../src/utils/crc32'
async function fixture(page: Page, width = 400, height = 300, transparent = false) {
 return page.evaluate(({width,height,transparent})=>{
  const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d')!
  for(const [color,a,b] of [['#ff0000',0,0],['#00ff00',width/2,0],['#0000ff',0,height/2],['#ffff00',width/2,height/2]] as const){if(transparent&&a>0&&b>0)continue;x.fillStyle=color;x.fillRect(a,b,width/2,height/2)}
  return Array.from(Uint8Array.from(atob(c.toDataURL().split(',')[1]!),v=>v.charCodeAt(0)))
 },{width,height,transparent})
}
async function select(page:Page,bytes:number[],name='synthetic.png'){await page.getByLabel('选择待裁剪图片',{exact:true}).setInputFiles({name,mimeType:name.endsWith('.jpg')?'image/jpeg':'image/png',buffer:Buffer.from(bytes)});await expect(page.getByRole('status')).toContainText('图片已就绪')}
async function pixel(page:Page,x:number,y:number,which='裁剪结果预览'){
 return page.getByAltText(which,{exact:true}).evaluate(async(img:HTMLImageElement,{x,y})=>{await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);return {width:c.width,height:c.height,rgba:[...ctx.getImageData(x,y,1,1).data]}},{x,y})
}
async function generate(page:Page){await page.getByRole('button',{name:'生成裁剪图片',exact:true}).click();await expect(page.getByRole('status')).toContainText('生成完成')}
for(const width of [375,768,1440])test(`CROP 原像素裁剪、比例、拖动和真实下载 ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/office/image-crop/');await hydrated(page);await select(page,await fixture(page))
 for(const [label,value] of [['裁剪宽度','200'],['裁剪高度','100'],['X 坐标','100'],['Y 坐标','50']] as const)await page.getByLabel(label,{exact:true}).fill(value)
 await page.getByLabel('输出主尺寸（像素）',{exact:true}).fill('100');await generate(page)
 expect(await pixel(page,10,10)).toEqual({width:100,height:50,rgba:[255,0,0,255]});expect((await pixel(page,90,10)).rgba).toEqual([0,255,0,255])
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'下载裁剪图片',exact:true}).click();const d=await download;expect(d.suggestedFilename()).toBe('cropped-image.png');await d.saveAs(info.outputPath('cropped-image.png'));expect([...(await fs.readFile(info.outputPath('cropped-image.png'))).subarray(0,4)]).toEqual([137,80,78,71])
 await page.getByRole('button',{name:'恢复整图',exact:true}).click();await expect(page.locator('a[download]')).toHaveCount(0)
 await page.getByLabel('裁剪比例',{exact:true}).selectOption('16:9');await expect(page.getByLabel('裁剪宽度',{exact:true})).toHaveValue('400');await expect(page.getByLabel('裁剪高度',{exact:true})).toHaveValue('225');await expect(page.getByLabel('Y 坐标',{exact:true})).toHaveValue('37')
 await page.getByLabel('输出主尺寸（像素）',{exact:true}).fill('200');await generate(page);expect((await pixel(page,1,1)).height).toBe(113)
 // Invalid drafts retain input and cannot export the previous rectangle.
 await page.getByLabel('X 坐标',{exact:true}).fill('999');await expect(page.getByRole('button',{name:'生成裁剪图片',exact:true})).toBeDisabled();await expect(page.getByLabel('X 坐标',{exact:true})).toHaveValue('999');await expect(page.locator('a[download]')).toHaveCount(0)
 await page.getByRole('button',{name:'恢复整图',exact:true}).click();await page.getByLabel('裁剪宽度',{exact:true}).fill('200');await page.getByLabel('裁剪高度',{exact:true}).fill('100');await page.getByLabel('裁剪高度',{exact:true}).blur()
 const preview=page.getByAltText('原图裁剪预览',{exact:true});await preview.scrollIntoViewIfNeeded();const bounds=(await preview.boundingBox())!
 const box=page.locator('.crop-box');await page.mouse.move(bounds.x+bounds.width/4,bounds.y+bounds.height/6);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/4+bounds.width/10,bounds.y+bounds.height/6+bounds.height/10,{steps:5});await page.mouse.up()
 await expect(page.getByLabel('X 坐标',{exact:true})).toHaveValue('40');await expect(page.getByLabel('Y 坐标',{exact:true})).toHaveValue('30')
 const before=await box.boundingBox();const handle=page.locator('.crop-handle.se');await handle.scrollIntoViewIfNeeded();const hb=(await handle.boundingBox())!;await page.mouse.move(hb.x+22,hb.y+22);await page.mouse.down();await page.mouse.move(hb.x+22-bounds.width/10,hb.y+22-bounds.height/10,{steps:5});await page.mouse.up();expect((await box.boundingBox())!.width).toBeLessThan(before!.width)
 const xInput=page.getByLabel('X 坐标',{exact:true});await xInput.focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText('0');await page.keyboard.press('Tab');await expect(xInput).toHaveValue('0')
 for(const handle of await page.locator('.crop-handle').all()){
  await expect(handle).toHaveCSS('width','44px');await expect(handle).toHaveCSS('height','44px')
  // Firefox can report 43.99998474121094 for a computed 44px edge.
  const b=await handle.boundingBox();expect(b!.width).toBeGreaterThanOrEqual(44-0.0001);expect(b!.height).toBeGreaterThanOrEqual(44-0.0001)
 }
 await page.screenshot({path:info.outputPath(`crop-${width}.png`),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.getByRole('button',{name:'清空',exact:true}).click();await expect(page.getByLabel('选择待裁剪图片',{exact:true})).toBeFocused()
})
test('CROP 透明、JPG白底、WebP能力、原图与预览分离',async({page,browserName})=>{
 await page.goto('/office/image-crop/');await hydrated(page);await select(page,await fixture(page,1600,800,true))
 expect((await pixel(page,1,1,'原图裁剪预览')).width).toBe(1280)
 await page.getByLabel('裁剪宽度',{exact:true}).fill('400');await page.getByLabel('裁剪高度',{exact:true}).fill('200');await page.getByLabel('X 坐标',{exact:true}).fill('1000');await page.getByLabel('Y 坐标',{exact:true}).fill('500')
 await generate(page);expect(await pixel(page,50,50)).toEqual({width:400,height:200,rgba:[0,0,0,0]})
 await page.getByLabel('输出格式',{exact:true}).selectOption('jpeg');await generate(page);expect((await pixel(page,50,50)).rgba).toEqual([255,255,255,255])
 await page.getByLabel('输出格式',{exact:true}).selectOption('webp');await page.getByRole('button',{name:'生成裁剪图片',exact:true}).click()
 if(browserName==='webkit'){await expect(page.getByRole('status')).toContainText('不支持所选格式');await expect(page.locator('a[download]')).toHaveCount(0)}else{await expect(page.getByRole('status')).toContainText('生成完成');expect((await pixel(page,50,50)).rgba[3]).toBe(0)}
})
test('CROP EXIF八方向的原图坐标与导出像素一致',async({page})=>{
 await page.goto('/office/image-crop/');await hydrated(page)
 const jpegs=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=80;c.height=40;const x=c.getContext('2d')!
  for(const [color,a,b] of [['#ff0000',0,0],['#00ff00',40,0],['#0000ff',0,20],['#ffff00',40,20]] as const){x.fillStyle=color;x.fillRect(a,b,40,20)}
  const raw=Array.from(Uint8Array.from(atob(c.toDataURL('image/jpeg',1).split(',')[1]!),v=>v.charCodeAt(0))),jpeg=raw.slice(0,2);let at=2
  while(at<raw.length){if(raw[at+1]===0xda){jpeg.push(...raw.slice(at));break}const end=at+2+raw[at+2]!*256+raw[at+3]!;if(!(raw[at+1]===0xe1&&String.fromCharCode(...raw.slice(at+4,at+10))==='Exif\0\0'))jpeg.push(...raw.slice(at,end));at=end}
  return Array.from({length:8},(_,i)=>{const exif=[69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,i+1,0,0,0,0,0,0,0];return [255,216,255,225,0,exif.length+2,...exif,...jpeg.slice(2)]})
 })
 const expected=[[255,0,0],[0,255,0],[255,255,0],[0,0,255],[255,0,0],[0,0,255],[255,255,0],[0,255,0]]
 for(const [i,bytes] of jpegs.entries()){
  await select(page,bytes,`orientation-${i+1}.jpg`);const dim=i<4?{width:80,height:40}:{width:40,height:80}
  const preview=await pixel(page,5,5,'原图裁剪预览');expect(preview.width).toBe(dim.width);expect(preview.height).toBe(dim.height)
  for(let n=0;n<3;n++)expect(Math.abs(preview.rgba[n]!-expected[i]![n]!)).toBeLessThan(25)
  await page.getByLabel('裁剪宽度',{exact:true}).fill('10');await page.getByLabel('裁剪高度',{exact:true}).fill('10');await generate(page);const result=await pixel(page,5,5);expect(result.width).toBe(10);expect(result.rgba).toEqual(preview.rgba)
 }
})
test('CROP 拒绝损坏、动画、超限与本地隔离、取消和离页',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4177/')&&!r.url().startsWith('blob:'))external.push(r.url())})
 await page.goto('/');await hydrated(page);await page.getByLabel('搜索工具',{exact:true}).fill('图片尺寸');await page.getByRole('link',{name:'打开工具 ：图片尺寸与裁剪',exact:true}).click();await expect(page).toHaveURL('/office/image-crop/');await hydrated(page)
 const bytes=await fixture(page);await select(page,bytes)
 await page.evaluate(async()=>{(Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='生成裁剪图片') as HTMLButtonElement).click();await Promise.resolve();(Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='取消处理') as HTMLButtonElement).click()});await expect(page.getByRole('status')).toContainText('已取消');await expect(page.locator('a[download]')).toHaveCount(0)
 await page.getByLabel('选择待裁剪图片',{exact:true}).setInputFiles({name:'PRIVATE.png',mimeType:'image/png',buffer:Buffer.from('PRIVATE-BROKEN')});await expect(page.getByRole('status')).toContainText('损坏');await expect(page.getByRole('status')).not.toContainText('PRIVATE');await expect(page.locator('.crop-preview')).toHaveCount(0)
 await page.getByLabel('选择待裁剪图片',{exact:true}).setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(10*1024**2+1)});await expect(page.getByRole('status')).toContainText('10 MiB')
 const chunk=Buffer.alloc(20);chunk.writeUInt32BE(8,0);chunk.write('acTL',4);chunk.writeUInt32BE(1,8);chunk.writeUInt32BE(finishCrc32(updateCrc32(0xffffffff,chunk.subarray(4,16))),16)
 const animated=Buffer.concat([Buffer.from(bytes.slice(0,33)),chunk,Buffer.from(bytes.slice(33))]);await page.getByLabel('选择待裁剪图片',{exact:true}).setInputFiles({name:'animated.png',mimeType:'image/png',buffer:animated});await expect(page.getByRole('status')).toContainText('不支持')
 const huge=Buffer.from(bytes);huge.writeUInt32BE(10001,16);huge.writeUInt32BE(finishCrc32(updateCrc32(0xffffffff,huge.subarray(12,29))),29);await page.getByLabel('选择待裁剪图片',{exact:true}).setInputFiles({name:'pixels.png',mimeType:'image/png',buffer:huge});await expect(page.getByRole('status')).toContainText('2000 万')
 await select(page,bytes);await generate(page);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect(page.locator('a[download]')).toHaveCount(0);await expect(page.locator('.crop-preview')).toHaveCount(0)
 expect(external).toEqual([]);expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0)
})
