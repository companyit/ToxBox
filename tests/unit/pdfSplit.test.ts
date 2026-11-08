import { expect, test, vi } from 'vitest'
import { PDFDocument, degrees, PDFDict, PDFName, PDFRawStream } from 'pdf-lib'
import { parsePdfSelection, validateSplitFile } from '../../src/utils/pdfSelection'
import { exportPdfSelection, inspectSplitPdf } from '../../src/utils/pdfSplit'
import { PDF_LIMITS } from '../../src/utils/pdfLimits'
async function source() {
  const doc = await PDFDocument.create()
  const image = await doc.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAFAAAAAoCAIAAADmAupWAAAAS0lEQVR4nO3PAQkAIBDAQJOYzrDGMoawP1iA3drnjmp9PwAGBgYGBgYeE3A94HrA9YDrAdcDrgdcD7gecD3gesD1gOsB1wOuB1zvAaPtHfFoIvElAAAAAElFTkSuQmCC','base64'))
  for (let i = 1; i <= 6; i++) { const page = doc.addPage([100 + i * 10, 300]); page.drawText(`Source page ${i}`, { x: 10, y: 100 }); page.drawImage(image,{x:10,y:10,width:40,height:20}); if (i === 3) page.setRotation(degrees(90)) }
  return new File([Uint8Array.from(await doc.save()).buffer], 'private.pdf')
}
test('选页保留首次出现顺序，支持范围与两侧空白', () => {
  expect(parsePdfSelection('5,1-3,2', 6, 'single')).toEqual([5,1,2,3])
  expect(parsePdfSelection(' 3 , 1 - 2 , 3 ', 6, 'pages')).toEqual([3,1,2])
  expect(parsePdfSelection('1-500', 500, 'single')).toHaveLength(500)
  expect(parsePdfSelection('1', 1, 'pages')).toEqual([1])
})
test('异常语法、越界和极长端点在展开前被拒绝', () => {
  for (const value of ['', ' ', '0','01','+1','-1','1.0','1e2','1，2','1 2','1,,2','1,',',1','2-1','1-7','7','1-','1--2','1-2-3','1-999999999999999999999999','<script>1</script>']) expect(() => parsePdfSelection(value, 6, 'single')).toThrow()
  for (const count of [0,501,NaN,1.5]) expect(() => parsePdfSelection('1',count,'single')).toThrow()
  expect(() => parsePdfSelection('1',6,'unknown' as 'single')).toThrow()
})
test('输入长度/片段与逐页 20 页边界不截断', () => {
  expect(parsePdfSelection(' '.repeat(999)+'1',500,'single')).toEqual([1])
  expect(() => parsePdfSelection(' '.repeat(1000)+'1',500,'single')).toThrow()
  expect(parsePdfSelection(Array(100).fill('1').join(','),500,'single')).toEqual([1])
  expect(() => parsePdfSelection(Array(101).fill('1').join(','),500,'single')).toThrow()
  expect(parsePdfSelection('1-20',500,'pages')).toHaveLength(20)
  expect(() => parsePdfSelection('1-21',500,'pages')).toThrow(/20/)
  expect(parsePdfSelection('1-20,1-20',500,'pages')).toHaveLength(20)
})
test('单文件校验接受 20 MiB，拒绝空文件/错误扩展名/超限', () => {
  expect(() => validateSplitFile({ name: 'A.PDF', size: PDF_LIMITS.fileBytes })).not.toThrow()
  for (const file of [{name:'a.pdf',size:0},{name:'a.pdf',size:PDF_LIMITS.fileBytes+1},{name:'a.docx',size:10}]) expect(() => validateSplitFile(file)).toThrow()
})
test('真实 PDF 检查与单份选页保留尺寸、旋转和页序', async () => {
  const file = await source()
  expect(await inspectSplitPdf(file)).toBe(6)
  const outputs = await exportPdfSelection(file,'5,1-3,2','single')
  expect(outputs.map(output => output.name)).toEqual(['selected.pdf'])
  const pdf = await PDFDocument.load(outputs[0]!.bytes)
  expect(pdf.getPages().map(page => [page.getWidth(),page.getRotation().angle])).toEqual([[150,0],[110,0],[120,0],[130,90]])
  for (const page of pdf.getPages()) {
    const objects = page.node.Resources()!.lookup(PDFName.of('XObject'),PDFDict)
    expect(objects.keys()).toHaveLength(1)
    const image = objects.lookup(objects.keys()[0]!)
    expect(image).toBeInstanceOf(PDFRawStream)
    if (!(image instanceof PDFRawStream)) throw Error('Expected an embedded PDF image stream')
    expect(image.dict.lookup(PDFName.of('Subtype'))).toBe(PDFName.of('Image'))
    expect(image.dict.lookup(PDFName.of('Width'))?.toString()).toBe('80')
  }
})
test('真实 PDF 逐页导出每份一页，命名来自原页号而非私有文件名', async () => {
  const outputs = await exportPdfSelection(await source(),'3,1','pages')
  expect(outputs.map(output => [output.name,output.page])).toEqual([['page-0003.pdf',3],['page-0001.pdf',1]])
  for (const [index,output] of outputs.entries()) {
    const doc = await PDFDocument.load(output.bytes)
    expect(doc.getPageCount()).toBe(1);expect(doc.getPage(0).getWidth()).toBe(index === 0 ? 130 : 110)
  }
})
test('Worker 算法重新检查源文件与选页，不信任界面结果', async () => {
  await expect(inspectSplitPdf(new File(['not pdf'],'a.pdf'))).rejects.toThrow()
  await expect(exportPdfSelection(await source(),'7','single')).rejects.toThrow()
  const doc = await PDFDocument.create();doc.addPage();doc.getForm().createTextField('field')
  await expect(inspectSplitPdf(new File([Uint8Array.from(await doc.save()).buffer],'form.pdf'))).rejects.toThrow()
})
test('逐页序列化累计超限时整批拒绝，不返回部分结果', async () => {
  const file = await source()
  const save = vi.spyOn(PDFDocument.prototype,'save')
    .mockResolvedValueOnce(new Uint8Array(60 * 1024 ** 2))
    .mockResolvedValueOnce(new Uint8Array(40 * 1024 ** 2 + 1))
  try { await expect(exportPdfSelection(file,'1,2','pages')).rejects.toThrow(/100 MiB/);expect(save).toHaveBeenCalledTimes(2) }
  finally { save.mockRestore() }
})
