import mammoth from 'mammoth'
import { inspectDocx, imageDimensions, DOCX_LIMITS, type DocxImage } from '../utils/docxValidation'
// 解析库可能输出带输入片段的诊断；仅在独立 Worker 内禁用日志。
for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) console[method] = () => {}
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const buffer = await event.data.arrayBuffer()
    await inspectDocx(buffer)
    const images: DocxImage[] = []; let total = 0
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, {
      externalFileAccess: false, includeEmbeddedStyleMap: false,
      convertImage: mammoth.images.imgElement(async image => {
        if (!['image/png', 'image/jpeg'].includes(image.contentType)) throw Error('图片格式不支持。')
        const raw = await image.readAsArrayBuffer()
        // Mammoth 1.13 的实际 ZIP 适配器返回 Uint8Array，类型声明写作 ArrayBuffer。
        const bytes = raw instanceof ArrayBuffer ? raw : Uint8Array.from(raw as unknown as Uint8Array).buffer
        total += bytes.byteLength
        if (images.length >= DOCX_LIMITS.images || total > DOCX_LIMITS.imageBytes) throw Error('图片超限。')
        imageDimensions(bytes, image.contentType)
        const id = `local-image-${images.length}`
        images.push({ id, type: image.contentType, bytes }); return { src: id }
      }),
    })
    if (result.value.length > 10 * 1024 ** 2 || result.messages.some(m => m.type === 'error')) throw Error('转换失败。')
    self.postMessage({ ok: true, html: result.value, images, warning: result.messages.length > 0 })
  } catch { self.postMessage({ ok: false, message: '无法转换 DOCX：文件可能损坏、加密、格式不支持或超过安全限额。请使用普通 DOCX 后重试。' }) }
}
