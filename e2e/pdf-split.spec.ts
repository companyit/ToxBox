import { test, expect, hydrated } from './helpers'
import { PDFDocument, degrees } from 'pdf-lib'
import fs from 'node:fs/promises'
async function fixture() {
  const doc = await PDFDocument.create()
  for (let number = 1; number <= 30; number++) {
    const page = doc.addPage([200 + number * 10, 400])
    page.drawText(`Source page ${number}`,{x:20,y:200,size:12})
    if (number === 3) page.setRotation(degrees(90))
  }
  return Buffer.from(await doc.save())
}
for (const width of [375,768,1440]) {
  test(`SPLIT 真实 Worker 两种下载与失效 ${width}`,async({page},info)=>{
    await page.setViewportSize({width,height:900})
    await page.goto('/office/pdf-split/');await hydrated(page)
    await page.getByLabel('选择待拆分的 PDF',{exact:true}).setInputFiles({name:'private-source.pdf',mimeType:'application/pdf',buffer:await fixture()})
    await expect(page.getByRole('status')).toContainText('文件检查通过')
    const input=page.getByLabel('需要导出的页码',{exact:true}), mode=page.getByLabel('导出模式',{exact:true}), action=page.getByRole('button',{name:'导出所选页面',exact:true})
    await input.fill('5,1-3,2');await expect(page.locator('#split-selection')).toContainText('实际页序：5, 1, 2, 3')
    await action.focus();await page.keyboard.press('Enter');await expect(page.getByRole('status')).toContainText('导出完成')
    const combinedEvent=page.waitForEvent('download');await page.getByRole('link',{name:'下载 selected.pdf',exact:true}).click();const combined=await combinedEvent
    expect(combined.suggestedFilename()).toBe('selected.pdf');await combined.saveAs(info.outputPath('selected.pdf'))
    const output=await PDFDocument.load(await fs.readFile(info.outputPath('selected.pdf')))
    expect(output.getPages().map(p=>[p.getWidth(),p.getRotation().angle])).toEqual([[250,0],[210,0],[220,0],[230,90]])
    await page.screenshot({path:info.outputPath(`single-${width}.png`),fullPage:true})
    await mode.selectOption('pages');await expect(page.getByRole('link',{name:'下载 selected.pdf',exact:true})).toHaveCount(0)
    await input.fill('1-21');await expect(page.locator('#split-selection')).toContainText('最多 20 页');await expect(action).toBeDisabled();await expect(input).toHaveValue('1-21')
    await input.fill('3,1');await action.click();await expect(page.getByRole('status')).toContainText('导出完成')
    await expect(page.locator('.split-downloads a')).toHaveCount(2)
    for(const [number,width] of [[3,230],[1,210]]) {
      const name=`page-${String(number).padStart(4,'0')}.pdf`
      const downloadEvent=page.waitForEvent('download');await page.getByRole('link',{name:`下载第 ${number} 页：${name}`,exact:true}).click();const download=await downloadEvent
      expect(download.suggestedFilename()).toBe(name);await download.saveAs(info.outputPath(name))
      const pdf=await PDFDocument.load(await fs.readFile(info.outputPath(name)))
      expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getWidth()).toBe(width)
    }
    await page.screenshot({path:info.outputPath(`pages-${width}.png`),fullPage:true})
    await input.fill('1,,2');await expect(page.locator('.split-downloads a')).toHaveCount(0);await expect(action).toBeDisabled();await expect(input).toHaveValue('1,,2')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.getByRole('button',{name:'清空',exact:true}).click();await expect(input).toHaveValue('');await expect(page.getByLabel('选择待拆分的 PDF',{exact:true})).toBeFocused();await expect(page.locator('.split-controls')).not.toContainText('private-source.pdf')
  })
}
test('SPLIT 首页搜索、独立敏感文档及重选失败清理',async({page})=>{
  await page.goto('/');await hydrated(page)
  await page.getByLabel('搜索工具',{exact:true}).fill('拆分');await expect(page.locator('.tool-grid li')).toHaveCount(1)
  await page.evaluate(()=>{(window as unknown as {splitMarker:boolean}).splitMarker=true})
  await Promise.all([page.waitForURL('http://127.0.0.1:4177/office/pdf-split/',{waitUntil:'load'}),page.getByRole('link',{name:'打开工具 ：PDF 拆分与选页导出',exact:true}).click()]);await hydrated(page)
  expect(await page.evaluate(()=>(window as unknown as {splitMarker?:boolean}).splitMarker)).toBeUndefined()
  await expect(page.locator('#workdev-google-tag')).toHaveCount(0)
  const picker=page.getByLabel('选择待拆分的 PDF',{exact:true})
  await picker.setInputFiles({name:'source.pdf',mimeType:'application/pdf',buffer:await fixture()});await expect(page.getByRole('status')).toContainText('文件检查通过')
  await page.getByRole('button',{name:'选择全部页面',exact:true}).click();await expect(page.getByLabel('需要导出的页码',{exact:true})).toHaveValue('1-30')
  await page.getByRole('button',{name:'导出所选页面',exact:true}).click();await expect(page.getByRole('status')).toContainText('导出完成')
  await picker.setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-broken')});await expect(page.getByRole('status')).toContainText('检查或导出失败')
  await expect(page.locator('.split-downloads a')).toHaveCount(0);await expect(page.getByRole('button',{name:'导出所选页面',exact:true})).toBeDisabled()
  await page.evaluate(()=>{(window as unknown as {splitMarker:boolean}).splitMarker=true})
  await Promise.all([page.waitForURL('http://127.0.0.1:4177/',{waitUntil:'load'}),page.getByRole('link',{name:'首页',exact:true}).click()]);await hydrated(page)
  expect(await page.evaluate(()=>(window as unknown as {splitMarker?:boolean}).splitMarker)).toBeUndefined()
})
