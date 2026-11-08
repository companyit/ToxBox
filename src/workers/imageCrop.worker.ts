import { inspectConvertImage, validateConvertFiles, checkConvertPixels, fitImage, ImageConvertError } from '../utils/imageConvert'
import { validateCropOptions, ImageCropError, type CropOptions } from '../utils/imageCrop'
for (const method of ['log','warn','error','info','debug'] as const) console[method] = () => {}
self.onmessage = async (event: MessageEvent<{ task: 'inspect' | 'export'; file: File; options?: CropOptions }>) => {
  let bitmap: ImageBitmap | undefined
  try {
    const { file, task, options } = event.data
    validateConvertFiles([file])
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') throw new ImageCropError('capability')
    const bytes = new Uint8Array(await file.arrayBuffer()), info = inspectConvertImage(bytes, file.name)
    checkConvertPixels(info.width, info.height)
    bitmap = await createImageBitmap(new Blob([bytes], { type: info.type }), { imageOrientation: 'from-image' })
    const image = { width: bitmap.width, height: bitmap.height }
    checkConvertPixels(image.width, image.height)
    const output = task === 'inspect' ? fitImage(image.width, image.height, 1280) : options && validateCropOptions(options, image)
    if (!output) throw new ImageCropError('options')
    const canvas = new OffscreenCanvas(output.width, output.height), ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageCropError('capability')
    const format = task === 'inspect' ? 'png' : options!.format
    if (format === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, output.width, output.height) }
    if (task === 'inspect') ctx.drawImage(bitmap, 0, 0, output.width, output.height)
    else { const r = options!.rect; ctx.drawImage(bitmap, r.x, r.y, r.width, r.height, 0, 0, output.width, output.height) }
    const mime = `image/${format}`, blob = await canvas.convertToBlob({ type: mime, quality: (options?.quality ?? 90) / 100 })
    if (blob.type !== mime || !blob.size) throw new ImageCropError('capability')
    if (blob.size > 100 * 1024 ** 2) throw new ImageCropError('output')
    // Re-read encoded signature/dimensions before publishing the output.
    const encoded = inspectConvertImage(new Uint8Array(await blob.arrayBuffer()), `output.${format === 'jpeg' ? 'jpg' : format}`)
    if (encoded.width !== output.width || encoded.height !== output.height) throw new ImageCropError('failed')
    self.postMessage({ ok: true, image, output, blob })
  } catch (error) {
    const code = error instanceof ImageCropError || error instanceof ImageConvertError ? error.code : 'failed'
    self.postMessage({ ok: false, code: error instanceof ImageConvertError && (code === 'size' || code === 'files') ? 'files' : code })
  } finally { bitmap?.close() }
}
