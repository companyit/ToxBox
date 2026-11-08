import { PDFDocument } from 'pdf-lib'
import { updateCrc32, finishCrc32 } from './crc32'
import { IMAGE_PDF_LIMITS, ImagePdfError, validateImageFiles, validateImagePixels } from './imagePdfLimits'
export type ImagePdfOptions = { direction: 'portrait' | 'landscape'; margin: 0 | 12 | 20 }
export type ImageInfo = { width: number; height: number; orientation: number; type: 'image/png' | 'image/jpeg' }
const invalid = (): never => { throw new ImagePdfError('format') }
function exifOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 8) return invalid()
  const little = bytes[0] === 0x49 && bytes[1] === 0x49
  if (!little && !(bytes[0] === 0x4d && bytes[1] === 0x4d)) return invalid()
  if (view.getUint16(2, little) !== 42) return invalid()
  const offset = view.getUint32(4, little)
  if (offset < 8 || offset + 2 > bytes.length) return invalid()
  const count = view.getUint16(offset, little)
  if (offset + 2 + count * 12 + 4 > bytes.length) return invalid()
  let result = 1, seen = false
  for (let i = 0; i < count; i++) {
    const at = offset + 2 + i * 12
    if (view.getUint16(at, little) !== 0x112) continue
    if (seen || view.getUint16(at + 2, little) !== 3 || view.getUint32(at + 4, little) !== 1) return invalid()
    result = view.getUint16(at + 8, little); seen = true
    if (result < 1 || result > 8) return invalid()
  }
  return result
}
export function inspectImage(bytes: Uint8Array, name: string): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const isPng = /\.png$/i.test(name)
  let width = 0, height = 0, orientation = 1
  if (isPng) {
    if (bytes.length < 33 || ![137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return invalid()
    let at = 8, header = false, data = false, end = false, exif = false
    while (at + 12 <= bytes.length) {
      const length = view.getUint32(at), stop = at + 12 + length
      if (stop > bytes.length) return invalid()
      const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
      if (!/^[A-Za-z]{4}$/.test(type) || finishCrc32(updateCrc32(0xffffffff, bytes.subarray(at + 4, at + 8 + length))) !== view.getUint32(at + 8 + length)) return invalid()
      if (!header && type !== 'IHDR') return invalid()
      if (type === 'IHDR') {
        if (header || length !== 13) return invalid()
        width = view.getUint32(at + 8); height = view.getUint32(at + 12)
        if (bytes[at + 16] !== 8 || ![0,2,3,4,6].includes(bytes[at + 17]!) || bytes[at + 18] !== 0 || bytes[at + 19] !== 0 || bytes[at + 20] !== 0) return invalid()
        validateImagePixels(width, height); header = true
      }
      if (['acTL','fcTL','fdAT'].includes(type)) return invalid()
      if (type === 'eXIf') { if (exif || data) return invalid(); orientation = exifOrientation(bytes.subarray(at + 8, at + 8 + length)); exif = true }
      if (type === 'IDAT') data = true
      if (type === 'IEND') { if (length || !data || stop !== bytes.length) return invalid(); end = true; break }
      at = stop
    }
    if (!header || !end) return invalid()
  } else {
    if (!/\.jpe?g$/i.test(name) || bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return invalid()
    let at = 2, found = false, scanned = false, exif = false
    while (at < bytes.length - 2) {
      if (bytes[at++] !== 255) return invalid()
      while (bytes[at] === 255) at++
      const marker = bytes[at++]
      if (marker === undefined || marker === 0 || marker === 216 || marker === 217 || at + 2 > bytes.length) return invalid()
      const length = view.getUint16(at), stop = at + length
      if (length < 2 || stop > bytes.length) return invalid()
      if (marker === 0xe1 && length >= 8 && String.fromCharCode(...bytes.subarray(at + 2, at + 8)) === 'Exif\0\0') {
        if (exif) return invalid()
        orientation = exifOrientation(bytes.subarray(at + 8, stop)); exif = true
      }
      if ([0xc0,0xc2].includes(marker)) {
        if (found || length < 8 || bytes[at + 2] !== 8 || ![1,3].includes(bytes[at + 7]!)) return invalid()
        height = view.getUint16(at + 3); width = view.getUint16(at + 5)
        validateImagePixels(width, height); found = true
      } else if (marker >= 0xc0 && marker <= 0xcf && ![0xc4,0xc8,0xcc].includes(marker)) return invalid()
      if (marker === 0xda) { scanned = true; break }
      at = stop
    }
    if (!found || !scanned) return invalid()
  }
  return { width, height, orientation, type: isPng ? 'image/png' : 'image/jpeg' }
}
export function imagePlacement(width: number, height: number, options: ImagePdfOptions) {
  if (!['portrait','landscape'].includes(options.direction) || ![0,12,20].includes(options.margin)) throw new ImagePdfError('options')
  validateImagePixels(width, height)
  const pt = 72 / 25.4, pageWidth = (options.direction === 'portrait' ? 210 : 297) * pt, pageHeight = (options.direction === 'portrait' ? 297 : 210) * pt, margin = options.margin * pt
  const scale = Math.min((pageWidth - margin * 2) / width, (pageHeight - margin * 2) / height)
  return { pageWidth, pageHeight, width: width * scale, height: height * scale, x: (pageWidth - width * scale) / 2, y: (pageHeight - height * scale) / 2 }
}
export async function processImages(files: readonly File[], options?: ImagePdfOptions) {
  validateImageFiles(files)
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') throw new ImagePdfError('capability')
  const doc = options ? await PDFDocument.create() : undefined
  const infos: ImageInfo[] = []
  let total = 0
  for (const file of files) {
    const raw = await file.arrayBuffer(), info = inspectImage(new Uint8Array(raw), file.name)
    validateImagePixels(info.width, info.height, total); total += info.width * info.height
    let bitmap: ImageBitmap
    try { bitmap = await createImageBitmap(new Blob([raw], { type: info.type }), { imageOrientation: 'from-image' }) } catch { throw new ImagePdfError('decode') }
    try {
      const rotated = info.orientation >= 5
      if (bitmap.width !== (rotated ? info.height : info.width) || bitmap.height !== (rotated ? info.width : info.height)) throw new ImagePdfError('decode')
      infos.push({ ...info, width: bitmap.width, height: bitmap.height })
      if (doc && options) {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
        try {
          const context = canvas.getContext('2d')
          if (!context) throw new ImagePdfError('capability')
          context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0)
          const normalized = await canvas.convertToBlob({ type: 'image/png' }), image = await doc.embedPng(await normalized.arrayBuffer())
          const placement = imagePlacement(bitmap.width, bitmap.height, options)
          doc.addPage([placement.pageWidth, placement.pageHeight]).drawImage(image, placement)
        } finally { canvas.width = 1; canvas.height = 1 }
      }
    } finally { bitmap.close() }
  }
  const bytes = doc ? await doc.save() : undefined
  if (bytes && bytes.length > IMAGE_PDF_LIMITS.outputBytes) throw new ImagePdfError('output')
  return { infos, bytes }
}
