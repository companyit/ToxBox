import { test, expect } from 'vitest'
import { PDFDocument, degrees } from 'pdf-lib'
import JSZip from 'jszip'
import { loadPdf, processPdfs } from '../../src/utils/pdfMerge'
import { validatePdfFiles, PDF_LIMITS } from '../../src/utils/pdfLimits'
import { inspectDocx, validateZipDirectory } from '../../src/utils/docxValidation'
import { imageDimensions } from '../../src/utils/docxLimits'
import { isSensitivePath, isSensitiveRoute } from '../../src/utils/sensitivePages'
const array = (bytes: Uint8Array) => Uint8Array.from(bytes).buffer
async function pdf(sizes: number[][]) { const doc = await PDFDocument.create(); for (const size of sizes) doc.addPage([size[0]!,size[1]!]).setRotation(degrees(size[2] ?? 0)); return new File([array(await doc.save())], 'sample.pdf') }
async function zipDocx() {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('word/document.xml', '<document/>')
  return zip
}
test('PDF 全页合并保持顺序、尺寸、旋转和重复选择', async () => {
  const a = await pdf([[200,300],[400,500,90]]), b = await pdf([[600,700]])
  const result = await processPdfs([b,a,b], true)
  expect(result.counts).toEqual([1,2,1])
  const doc = await loadPdf(array(result.bytes!))
  expect(doc.getPages().map(p => [p.getWidth(),p.getHeight(),p.getRotation().angle])).toEqual([[600,700,0],[200,300,0],[400,500,90],[600,700,0]])
})
test('PDF 文件上限、空文件、扩展名、损坏、表单和总页数拒绝', async () => {
  expect(() => validatePdfFiles([{name:'a.pdf',size:PDF_LIMITS.fileBytes+1}])).toThrow()
  expect(() => validatePdfFiles(Array.from({length:11},()=>({name:'a.pdf',size:1})))).toThrow()
  expect(() => validatePdfFiles(Array.from({length:3},()=>({name:'a.pdf',size:PDF_LIMITS.fileBytes})))).toThrow()
  for (const file of [{name:'a.pdf',size:0},{name:'a.txt',size:1}]) expect(()=>validatePdfFiles([file])).toThrow()
  await expect(loadPdf(new TextEncoder().encode('invalid').buffer)).rejects.toThrow()
  await expect(loadPdf(new TextEncoder().encode('%PDF-broken').buffer)).rejects.toThrow()
  const doc = await PDFDocument.create(); doc.addPage(); doc.getForm().createTextField('field')
  await expect(loadPdf(array(await doc.save()))).rejects.toThrow(/表单/)
  await expect(processPdfs([await pdf([[200,300]])],true)).rejects.toThrow()
  const many = await pdf(Array.from({length:251},()=>[100,100]))
  await expect(processPdfs([many,many],false)).rejects.toThrow(/总页数/)
})
test('DOCX 校验真实 ZIP，拒绝宏、路径穿越和重复目录', async () => {
  const zip = await zipDocx(); const buffer = await zip.generateAsync({type:'arraybuffer'})
  await expect(inspectDocx(buffer)).resolves.toBeDefined()
  zip.file('word/vbaProject.bin','macro'); await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer'}))).rejects.toThrow()
  const traversal = await zipDocx(); traversal.file('word/../bad','x'); expect(()=>validateZipDirectory(buffer.slice(0,15))).toThrow()
  await expect(inspectDocx(await traversal.generateAsync({type:'arraybuffer'}))).rejects.toThrow()
  const duplicate = await zipDocx(); duplicate.file('one.xml','x'); duplicate.file('two.xml','y')
  const data = new Uint8Array(await duplicate.generateAsync({type:'arraybuffer'}))
  for (let i=0;i<data.length-7;i++) if (new TextDecoder().decode(data.slice(i,i+7))==='two.xml') data.set(new TextEncoder().encode('one.xml'),i)
  expect(()=>validateZipDirectory(data.buffer)).toThrow()
})
test('DOCX 实际流式解压限额和必需文件校验', async () => {
  const zip = await zipDocx(); zip.file('word/large.xml','x'.repeat(10*1024**2+1))
  await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}))).rejects.toThrow(/限额/)
  const empty = await new JSZip().file('file.txt','x').generateAsync({type:'arraybuffer'})
  await expect(inspectDocx(empty)).rejects.toThrow()
})
test('图片签名和像素验证，不接受 SVG 或伪 MIME', () => {
  expect(()=>imageDimensions(new TextEncoder().encode('<svg/>').buffer,'image/png')).toThrow()
  const png = new Uint8Array(24); png.set([137,80,78,71,13,10,26,10]); png.set(new TextEncoder().encode('IHDR'),12)
  const view = new DataView(png.buffer); view.setUint32(16,20000);view.setUint32(20,20000)
  expect(()=>imageDimensions(png.buffer,'image/png')).toThrow()
  view.setUint32(16,10);view.setUint32(20,20);expect(imageDimensions(png.buffer,'image/png')).toEqual({width:10,height:20})
})
test('敏感文档路径仅匹配两个新工具及原 2FA', () => {
  for (const [name,path] of [['pdf-split','/office/pdf-split/'],['pdf-merge','/office/pdf-merge/'],['word-to-pdf','/office/word-to-pdf'],['totp','/developer/2fa/']]) { expect(isSensitiveRoute(name)).toBe(true);expect(isSensitivePath(path!)).toBe(true) }
  for (const path of ['/office/','/office/pdf-merge/other','/Office/pdf-merge/']) expect(isSensitivePath(path)).toBe(false)
})
