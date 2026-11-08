import { PDFDocument, PDFName } from 'pdf-lib'
import { PDF_LIMITS, validatePdfFiles } from './pdfLimits'
export async function loadPdf(bytes: ArrayBuffer) {
  if (!new TextDecoder('ascii').decode(bytes.slice(0, 5)).startsWith('%PDF-')) throw Error('文件头不是 PDF。')
  let doc: PDFDocument
  try { doc = await PDFDocument.load(bytes, { throwOnInvalidObject: true, updateMetadata: false }) } catch { throw Error('无法读取 PDF，请检查文件是否损坏或已加密。') }
  if (doc.isEncrypted || doc.catalog.has(PDFName.of('AcroForm'))) throw Error('不支持加密或带表单/签名字段的 PDF。')
  if (!doc.getPageCount() || doc.getPageCount() > PDF_LIMITS.pages) throw Error('PDF 页数须为 1～500 页。')
  return doc
}
export async function processPdfs(files: readonly File[], merge: boolean) {
  validatePdfFiles(files)
  if (merge && files.length < 2) throw Error('合并至少需要两份 PDF。')
  const output = merge ? await PDFDocument.create() : undefined
  const counts: number[] = []
  for (const file of files) {
    const source = await loadPdf(await file.arrayBuffer())
    counts.push(source.getPageCount())
    if (counts.reduce((a, b) => a + b, 0) > PDF_LIMITS.pages) throw Error('总页数不能超过 500 页。')
    if (output) for (const page of await output.copyPages(source, source.getPageIndices())) output.addPage(page)
  }
  const bytes = output ? await output.save() : undefined
  if (bytes && bytes.byteLength > PDF_LIMITS.outputBytes) throw Error('合并结果超过 100 MiB，未生成下载。')
  return { counts, bytes }
}
