import { test, expect, hydrated } from './helpers'
import { PDFDocument, degrees } from 'pdf-lib'
import { createDocxFixture as docx } from '../tests/helpers/documentFixtures'
import fs from 'node:fs/promises'
import path from 'node:path'

const nativePrintPdf = path.join(process.env.WORKDEV_E2E_RUN_DIR!, 'firefox-native-print.pdf')
// Only this spec's temporary Firefox profile uses the virtual PDF printer.
test.use({ launchOptions: { firefoxUserPrefs: {
 'print.always_print_silent': true,
 'print_printer': 'Mozilla Save to PDF',
 'print.print_to_file': true,
 'print.print_to_filename': nativePrintPdf,
 'print.printer_Mozilla_Save_to_PDF.print_to_file': true,
 'print.printer_Mozilla_Save_to_PDF.print_to_filename': nativePrintPdf,
 'print.printer_Mozilla_Save_to_PDF.print_paper_size_unit': 1,
 'print.printer_Mozilla_Save_to_PDF.print_paper_width': '210',
 'print.printer_Mozilla_Save_to_PDF.print_paper_height': '297',
 'print.printer_Mozilla_Save_to_PDF.print_paper_id': 'iso_a4',
 ...Object.fromEntries(['headerleft','headercenter','headerright','footerleft','footercenter','footerright'].flatMap(position => [
  [`print.print_${position}`, ''],
  [`print.printer_Mozilla_Save_to_PDF.print_${position}`, ''],
 ])),
} } })

async function pdf(width: number, pages = 1) {
  const doc = await PDFDocument.create()
  for (let i=0;i<pages;i++) { const p=doc.addPage([width,400]); p.drawText(`Synthetic page ${width}-${i+1}`,{x:20,y:200,size:12}); if (i===1) p.setRotation(degrees(90)) }
  return Buffer.from(await doc.save())
}
for(const width of [375,768,1440]) {
 test(`DOC-LOCAL PDF 合并真实 Worker 与下载 ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:900})
  const requests:string[]=[],errors:string[]=[]
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/office/pdf-merge/');await hydrated(page)
  await page.getByLabel('选择或追加 PDF 文件').setInputFiles([{name:'A.pdf',mimeType:'application/pdf',buffer:await pdf(200,2)},{name:'B.pdf',mimeType:'application/pdf',buffer:await pdf(300)}])
  await expect(page.getByRole('status')).toContainText('检查通过')
  await page.getByRole('button',{name:'上移第 2 份文件',exact:true}).focus();await page.keyboard.press('Enter')
  await page.getByRole('button',{name:'合并 PDF',exact:true}).click();await expect(page.getByRole('status')).toContainText('合并完成')
  const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:'下载 merged.pdf'}).click();const download=await downloadEvent
  expect(download.suggestedFilename()).toBe('merged.pdf')
  await download.saveAs(info.outputPath('merged.pdf'))
  const output=await PDFDocument.load(await fs.readFile(info.outputPath('merged.pdf')))
  expect(output.getPages().map(p=>[p.getWidth(),p.getRotation().angle])).toEqual([[300,0],[200,0],[200,90]])
  await page.screenshot({path:info.outputPath(`pdf-${width}.png`),fullPage:true})
  await page.getByLabel('选择或追加 PDF 文件').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-invalid')})
  await expect(page.getByRole('status')).toContainText('无法读取');await expect(page.locator('.pdf-controls li')).toHaveCount(2);await expect(page.getByRole('link',{name:'下载 merged.pdf'})).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  expect(requests.every(url=>url.startsWith('http://127.0.0.1:4177/')||url.startsWith('blob:'))).toBe(true);expect(errors).toEqual([])
 })
 test(`DOC-LOCAL DOCX 简版真实 Worker 与打印正文 ${width}`,async({page,browserName},info)=>{
  await page.setViewportSize({width,height:900})
  const requests:string[]=[],errors:string[]=[]
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/office/word-to-pdf/');await hydrated(page)
  await page.getByLabel('选择 DOCX（最多 10 MiB）').setInputFiles({name:'synthetic-private.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await docx()})
  await page.getByRole('button',{name:'转换并预览',exact:true}).click();await expect(page.getByRole('status')).toContainText('已生成简版预览')
  const preview=page.getByRole('region',{name:'简版文档预览'})
  await expect(preview).toContainText('中文测试，第 70 段');await expect(preview.locator('table')).toHaveCount(1);await expect(preview.locator('img')).toHaveCount(2);await expect(preview.locator('a')).toHaveCount(0)
  await expect(preview.getByRole('heading',{name:'本地转换标题',exact:true})).toBeVisible()
  await expect(preview.locator('ol li')).toHaveText(['编号项目甲','编号项目乙']);await expect(preview.locator('ul li')).toHaveText(['无序项目甲','无序项目乙'])
  await expect(preview.locator('strong')).toHaveText('加粗文字');await expect(preview.locator('em')).toHaveText('斜体文字')
  await expect(page.getByRole('button',{name:'打印 / 另存为 PDF',exact:true})).toBeEnabled()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:info.outputPath(`docx-${width}.png`),fullPage:true})
  await page.emulateMedia({media:'print'});await expect(page.locator('#app')).toBeHidden();await expect(page.locator('#docx-print')).toBeVisible();await expect(page.locator('body')).toHaveCSS('background-color','rgb(255, 255, 255)')
  if(browserName==='chromium') {const bytes=await page.pdf({path:info.outputPath('docx-print.pdf'),preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1)}
  await page.emulateMedia({media:'screen'})
  await page.evaluate(() => {
    const events: string[] = []
    ;(window as unknown as { documentPrintEvents: string[] }).documentPrintEvents = events
    window.addEventListener('beforeprint', () => events.push('beforeprint'))
    window.addEventListener('afterprint', () => events.push('afterprint'))
  })
  if(browserName==='firefox') await expect(fs.stat(nativePrintPdf)).rejects.toMatchObject({code:'ENOENT'})
  await page.getByRole('button',{name:'打印 / 另存为 PDF',exact:true}).click()
  await expect(page.getByRole('status')).toContainText('已请求打印')
  await expect(page.getByRole('status')).not.toContainText('保存成功')
  const printEvents = await page.evaluate(() => (window as unknown as { documentPrintEvents: string[] }).documentPrintEvents)
  if(browserName==='firefox') {
   await expect.poll(async()=>{
    try {
     const bytes=await fs.readFile(nativePrintPdf)
     if(!bytes.toString('latin1').trimEnd().endsWith('%%EOF'))return 0
     return (await PDFDocument.load(bytes)).getPageCount()
    } catch { return 0 }
   },{timeout:15000,message:'原生打印必须生成新的完整多页 PDF'}).toBeGreaterThan(1)
   const nativePdf=await PDFDocument.load(await fs.readFile(nativePrintPdf))
   for(const sheet of nativePdf.getPages()) {
    expect(Math.abs(sheet.getWidth()-595.28)).toBeLessThan(1)
    expect(Math.abs(sheet.getHeight()-841.89)).toBeLessThan(1)
   }
   expect(printEvents).toContain('beforeprint');expect(printEvents).toContain('afterprint')
   await fs.rename(nativePrintPdf,info.outputPath('docx-native-print.pdf'))
  }
  await info.attach('真实打印调用事件', { body: JSON.stringify({ browserName, width, printEvents, systemSaveVerified: false }), contentType: 'application/json' })
  const damaged = await docx(), checksum = new DataView(damaged.buffer,damaged.byteOffset,damaged.byteLength)
  for(let i=0;i<=damaged.length-46;i++) if(checksum.getUint32(i,true)===0x02014b50) {checksum.setUint32(i+16,checksum.getUint32(i+16,true)^1,true);break}
  await page.getByLabel('选择 DOCX（最多 10 MiB）').setInputFiles({name:'damaged.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:damaged})
  await expect(preview).toHaveCount(0)
  await page.getByRole('button',{name:'转换并预览',exact:true}).click();await expect(page.getByRole('status')).toContainText('无法转换 DOCX')
  await expect(page.getByRole('button',{name:'打印 / 另存为 PDF',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'清空',exact:true}).click();await expect(preview).toHaveCount(0);await expect(page.locator('#docx-print')).toHaveCount(0)
  expect(requests.every(url=>url.startsWith('http://127.0.0.1:4177/')||url.startsWith('blob:'))).toBe(true);expect(errors).toEqual([])
 })
}
test('DOC-LOCAL 敏感文档边界双向整页隔离及搜索入口',async({page})=>{
 await page.goto('/');await hydrated(page)
 await page.getByLabel('搜索工具',{exact:true}).fill('PDF');await expect(page.locator('.tool-grid li')).toHaveCount(5)
 for(const name of ['PDF 合并','Word 转 PDF']) {
  await page.evaluate(()=>{(window as unknown as {sentinel?:boolean}).sentinel=true})
  const target = name === 'PDF 合并' ? '/office/pdf-merge/' : '/office/word-to-pdf/'
  await Promise.all([page.waitForURL('http://127.0.0.1:4177'+target,{waitUntil:'load'}), page.getByRole('link',{name:`打开工具 ：${name}`,exact:true}).click()]);await hydrated(page)
  expect(await page.evaluate(()=>(window as unknown as {sentinel?:boolean}).sentinel)).toBeUndefined()
  expect(await page.locator('#workdev-google-tag').count()).toBe(0)
  await page.evaluate(()=>{(window as unknown as {sentinel?:boolean}).sentinel=true})
  await Promise.all([page.waitForURL('http://127.0.0.1:4177/',{waitUntil:'load'}), page.getByRole('link',{name:'首页',exact:true}).click()]);await hydrated(page)
  expect(await page.evaluate(()=>(window as unknown as {sentinel?:boolean}).sentinel)).toBeUndefined()
  await page.getByLabel('搜索工具',{exact:true}).fill('PDF')
 }
})
