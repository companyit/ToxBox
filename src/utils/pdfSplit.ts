import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './pdfMerge'
import { PDF_LIMITS } from './pdfLimits'
import { parsePdfSelection, validateSplitFile, type PdfSplitMode } from './pdfSelection'
export interface PdfSplitOutput { name: string; page?: number; bytes: Uint8Array<ArrayBuffer> }
export async function inspectSplitPdf(file: File) {
  validateSplitFile(file)
  return (await loadPdf(await file.arrayBuffer())).getPageCount()
}
export async function exportPdfSelection(file: File, expression: string, mode: PdfSplitMode): Promise<PdfSplitOutput[]> {
  validateSplitFile(file)
  const source = await loadPdf(await file.arrayBuffer())
  const pages = parsePdfSelection(expression, source.getPageCount(), mode)
  const groups = mode === 'pages' ? pages.map(page => [page]) : [pages]
  const outputs: PdfSplitOutput[] = []
  let total = 0
  for (const group of groups) {
    const output = await PDFDocument.create()
    for (const page of await output.copyPages(source, group.map(number => number - 1))) output.addPage(page)
    const bytes = Uint8Array.from(await output.save())
    total += bytes.byteLength
    if (total > PDF_LIMITS.outputBytes) throw Error('拆分结果总大小超过 100 MiB。')
    outputs.push({ name: mode === 'single' ? 'selected.pdf' : `page-${String(group[0]).padStart(4, '0')}.pdf`, page: mode === 'pages' ? group[0] : undefined, bytes })
  }
  return outputs
}
