import { fileDiffLines, FileDiffError, fileDiffErrors } from './fileDiff'
export const FILE_TEXT_BYTES = 2 * 1024 * 1024
export const fileTextErrors = {
  extension: '请选择 TXT、Markdown、CSV 或 JSON 文本文件。',
  size: '每份文件最多 2 MiB，请缩小后重试。',
  encoding: '文件不是有效的 UTF-8 文本，请先另存为 UTF-8 后重试。',
  binary: '文件包含不支持的控制字符，请选择纯文本文件。',
  input: fileDiffErrors.input,
  lines: fileDiffErrors.lines,
  failed: '无法读取文件，请重新选择后重试。',
} as const
export type FileTextCode = keyof typeof fileTextErrors
export class FileTextError extends Error { constructor(readonly code: FileTextCode) { super(code) } }
export function validateTextFile(name: string, size: number) {
  if (!/\.(txt|md|markdown|csv|json)$/i.test(name)) throw new FileTextError('extension')
  if (!Number.isSafeInteger(size) || size < 0 || size > FILE_TEXT_BYTES) throw new FileTextError('size')
}
export function decodeFileText(bytes: Uint8Array): { text: string; lines: number } {
  if (bytes.byteLength > FILE_TEXT_BYTES) throw new FileTextError('size')
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { throw new FileTextError('encoding') }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new FileTextError('binary')
  try { const rows = fileDiffLines(text); return { text: rows.join('\n'), lines: rows.length } }
  catch (failure) { throw new FileTextError(failure instanceof FileDiffError && (failure.code === 'input' || failure.code === 'lines') ? failure.code : 'failed') }
}
