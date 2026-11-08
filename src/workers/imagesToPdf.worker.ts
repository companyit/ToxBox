import { processImages, type ImagePdfOptions } from '../utils/imagePdf'
import { ImagePdfError } from '../utils/imagePdfLimits'
for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) console[method] = () => {}
self.onmessage = async (event: MessageEvent<{ files: File[]; options?: ImagePdfOptions }>) => {
  try {
    const result = await processImages(event.data.files, event.data.options)
    self.postMessage({ ok: true, ...result })
  } catch (error) { self.postMessage({ ok: false, code: error instanceof ImagePdfError ? error.code : 'failed' }) }
}
