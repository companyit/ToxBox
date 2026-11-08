import JSZip from 'jszip'
import { updateCrc32, finishCrc32 } from './crc32'
import { DOCX_LIMITS } from './docxLimits'
export { imageDimensions, DOCX_LIMITS } from './docxLimits'
export type { DocxImage } from './docxLimits'
function reject(): never { throw Error('DOCX 格式不受支持、内容损坏或超过安全限额。') }
// 先检查原始中央目录，避免 JSZip 规范化路径或覆盖重复项后丢失证据。
export function validateZipDirectory(buffer: ArrayBuffer) {
  const view = new DataView(buffer), bytes = new Uint8Array(buffer)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) reject()
  const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true)
  if (!count || count > DOCX_LIMITS.entries || count !== view.getUint16(end + 8, true) || start + size !== end) reject()
  const names = new Set<string>(), checksums = new Map<string, number>(); let offset = start
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) reject()
    const flags = view.getUint16(offset + 8, true), method = view.getUint16(offset + 10, true)
    const length = view.getUint16(offset + 28, true), extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true)
    if ((view.getUint32(offset + 38, true) >>> 16 & 0xf000) === 0xa000 || flags & 1 || ![0, 8].includes(method) || view.getUint16(offset + 34, true)) reject()
    const next = offset + 46 + length + extra + comment
    if (next > end) reject()
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(offset + 46, offset + 46 + length))
    if (!name || name.startsWith('/') || name.includes('//') || /[\\:\x00-\x1f]/.test(name) || name.split('/').some(p => p === '..' || p === '.') || names.has(name) || /vbaProject|vbaData|macros/i.test(name)) reject()
    names.add(name)
    checksums.set(name, view.getUint32(offset + 16, true))
    const local = view.getUint32(offset + 42, true)
    if (local + 30 > start || view.getUint32(local, true) !== 0x04034b50 || view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method) reject()
    const localLength = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true)
    const localName = new TextDecoder('utf-8', { fatal: true }).decode(bytes.slice(local + 30, local + 30 + localLength))
    if (localName !== name || local + 30 + localLength + localExtra + view.getUint32(offset + 20, true) > start) reject()
    offset = next
  }
  if (offset !== end || !names.has('[Content_Types].xml') || !names.has('word/document.xml')) reject()
  return checksums
}
export async function inspectDocx(buffer: ArrayBuffer) {
  if (!buffer.byteLength || buffer.byteLength > DOCX_LIMITS.file) reject()
  const checksums = validateZipDirectory(buffer)
  const zip = await JSZip.loadAsync(buffer, { createFolders: false })
  let total = 0
  for (const file of Object.values(zip.files)) {
    if (file.dir) continue
    let length = 0, checksum = 0xffffffff
    await new Promise<void>((resolve, fail) => {
      const stream = (file as unknown as { internalStream(type: 'uint8array'): { on(event: 'data', fn: (chunk: Uint8Array) => void): void; on(event: 'error', fn: () => void): void; on(event: 'end', fn: () => void): void; pause(): void; resume(): void } }).internalStream('uint8array')
      stream.on('data', chunk => {
        length += chunk.length; total += chunk.length
        if (total > DOCX_LIMITS.expanded || (/\.xml$|\.rels$/i.test(file.name) && length > DOCX_LIMITS.xml)) {
          stream.pause(); fail(Error('DOCX 解压内容超过限额。')); return
        }
        checksum = updateCrc32(checksum, chunk)
      })
      stream.on('error', () => fail(Error('DOCX 解压失败。')))
      stream.on('end', () => {
        if (finishCrc32(checksum) !== checksums.get(file.name)) fail(Error('DOCX 内容校验失败，文件可能已损坏。'))
        else resolve()
      })
      stream.resume()
    })
    if (/\.xml$|\.rels$/i.test(file.name)) {
      const xml = await file.async('string')
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) reject()
    }
  }
  const types = await zip.file('[Content_Types].xml')!.async('string')
  const overrides = types.match(/<(?:[A-Za-z_][\w.-]*:)?Override\b[^>]*>/g) ?? []
  if (!overrides.some(tag => /\bPartName\s*=\s*(["'])\/word\/document\.xml\1/.test(tag) && /\bContentType\s*=\s*(["'])application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document\.main\+xml\1/.test(tag)) || /macroEnabled|vbaProject/i.test(types)) reject()
  return zip
}
