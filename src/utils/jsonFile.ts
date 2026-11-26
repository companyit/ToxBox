import { JSON_DIFF_INPUT } from './jsonDiff'
export const JSON_FILE_BYTES = 400000
export const jsonFileErrors = {
  extension: '请选择 .json 文件。',
  size: '每份 JSON 文件最多 400,000 字节，请缩小后重试。',
  input: '文件解码后超过 100,000 个 UTF-16 码元，请缩短后重试。',
  encoding: '文件不是有效的 UTF-8，请先另存为 UTF-8 后重试。',
  failed: '无法读取 JSON 文件，请重新选择后重试；当前输入已保留。',
} as const
export type JsonFileCode = keyof typeof jsonFileErrors
export class JsonFileError extends Error { constructor(readonly code: JsonFileCode) { super(code) } }
export function validateJsonFile(name: string, size: number) {
  if (!/\.json$/i.test(name)) throw new JsonFileError('extension')
  if (!Number.isSafeInteger(size) || size < 0 || size > JSON_FILE_BYTES) throw new JsonFileError('size')
}
export function decodeJsonFile(bytes: Uint8Array): string {
  if (bytes.byteLength > JSON_FILE_BYTES) throw new JsonFileError('size')
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) }
  catch { throw new JsonFileError('encoding') }
  if (text.length > JSON_DIFF_INPUT) throw new JsonFileError('input')
  return text
}
