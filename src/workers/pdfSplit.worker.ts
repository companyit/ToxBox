import { inspectSplitPdf, exportPdfSelection } from '../utils/pdfSplit'
import { PdfSelectionError, type PdfSplitMode } from '../utils/pdfSelection'
export type PdfSplitRequest = { kind: 'inspect'; file: File } | { kind: 'export'; file: File; expression: string; mode: PdfSplitMode }
export type PdfSplitResponse = { ok: true; kind: 'inspect'; pageCount: number } | { ok: true; kind: 'export'; outputs: Awaited<ReturnType<typeof exportPdfSelection>> } | { ok: false; message: string }
for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) console[method] = () => {}
self.onmessage = async (event: MessageEvent<PdfSplitRequest>) => {
  try {
    const request = event.data
    let response: PdfSplitResponse
    if (request.kind === 'inspect') response = { ok: true, kind: 'inspect', pageCount: await inspectSplitPdf(request.file) }
    else if (request.kind === 'export' && typeof request.expression === 'string') response = { ok: true, kind: 'export', outputs: await exportPdfSelection(request.file, request.expression, request.mode) }
    else throw Error('Invalid request')
    self.postMessage(response)
  } catch (error) {
    const response: PdfSplitResponse = { ok: false, message: error instanceof PdfSelectionError ? error.message : 'PDF 检查或导出失败，请检查文件、页码或减少页数后重试。不支持损坏、加密或带表单的 PDF。' }
    self.postMessage(response)
  }
}
