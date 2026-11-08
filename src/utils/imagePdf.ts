import { PDFDocument } from 'pdf-lib'
import { inspectImage, type ImageInfo } from './imageInspect'
export { inspectImage, type ImageInfo } from './imageInspect'
import { IMAGE_PDF_LIMITS, ImagePdfError, validateImageFiles, validateImagePixels } from './imagePdfLimits'
export type ImagePdfOptions = { direction: 'portrait' | 'landscape'; margin: 0 | 12 | 20 }
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
