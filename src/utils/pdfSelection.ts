import { PDF_LIMITS } from './pdfLimits'
export type PdfSplitMode = 'single' | 'pages'
export class PdfSelectionError extends Error {}
export function validateSplitFile(file: Pick<File, 'name' | 'size'>) {
  if (!/\.pdf$/i.test(file.name) || !file.size || file.size > PDF_LIMITS.fileBytes) {
    throw new PdfSelectionError('请选择非空 PDF 文件，每份最多 20 MiB。')
  }
}
export function parsePdfSelection(expression: string, pageCount: number, mode: PdfSplitMode): number[] {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > PDF_LIMITS.pages) throw new PdfSelectionError('请先检查有效的 PDF 文件。')
  if (mode !== 'single' && mode !== 'pages') throw new PdfSelectionError('请选择有效的导出模式。')
  if (expression.length > 1000) throw new PdfSelectionError('页码输入不能超过 1000 个 UTF-16 码元。')
  if (!expression.trim()) throw new PdfSelectionError('请输入需要导出的页码。')
  const parts = expression.split(',')
  if (parts.length > 100) throw new PdfSelectionError('页码片段不能超过 100 个。')
  const seen = new Set<number>()
  for (const part of parts) {
    const match = /^\s*([1-9][0-9]*)(?:\s*-\s*([1-9][0-9]*))?\s*$/.exec(part)
    if (!match) throw new PdfSelectionError('页码格式不正确，请用英文逗号和短横线，例如 1,3-5。')
    const start = Number(match[1]), end = Number(match[2] ?? match[1])
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > pageCount || end > pageCount) throw new PdfSelectionError('页码超出当前 PDF 范围。')
    if (start > end) throw new PdfSelectionError('范围起始页不能大于结束页。')
    for (let page = start; page <= end; page++) seen.add(page)
  }
  if (mode === 'pages' && seen.size > 20) throw new PdfSelectionError('逐页拆分最多 20 页，请减少页数或切换为导出一份 PDF。')
  return [...seen]
}
