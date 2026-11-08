export const IMAGE_PDF_LIMITS = { files: 20, fileBytes: 10 * 1024 ** 2, totalBytes: 50 * 1024 ** 2, side: 10000, pixels: 20_000_000, totalPixels: 80_000_000, outputBytes: 100 * 1024 ** 2 }
export const imagePdfErrors = {
  files: '请选择 1～20 张 JPG/JPEG/PNG 图片。',
  size: '每张须非空且不超过 10 MiB，总计最多 50 MiB。',
  format: '图片格式无效或不支持，请使用普通 8 位 JPG/PNG；不支持动画/隔行 PNG 或 CMYK JPEG。',
  pixels: '单边最多 10000 像素，每张最多 2000 万像素，总计最多 8000 万像素。',
  decode: '无法解码图片，请检查文件是否损坏或编码不受支持。',
  capability: '当前浏览器不支持本地图片处理，请使用支持 Worker 图片解码与画布的浏览器。',
  output: '生成结果超过 100 MiB，请减少图片后重试。',
  options: '页面或边距参数无效。',
  failed: '图片处理失败，请减少图片后重试。',
} as const
export type ImagePdfErrorCode = keyof typeof imagePdfErrors
export class ImagePdfError extends Error { constructor(public readonly code: ImagePdfErrorCode) { super(code) } }
export function validateImageFiles(files: readonly Pick<File, 'name' | 'size'>[]) {
  if (!files.length || files.length > IMAGE_PDF_LIMITS.files || files.some(f => !/\.(?:jpe?g|png)$/i.test(f.name))) throw new ImagePdfError('files')
  if (files.some(f => f.size <= 0 || f.size > IMAGE_PDF_LIMITS.fileBytes) || files.reduce((n, f) => n + f.size, 0) > IMAGE_PDF_LIMITS.totalBytes) throw new ImagePdfError('size')
}
export function validateImagePixels(width: number, height: number, total = 0) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > IMAGE_PDF_LIMITS.side || height > IMAGE_PDF_LIMITS.side || width * height > IMAGE_PDF_LIMITS.pixels || total + width * height > IMAGE_PDF_LIMITS.totalPixels) throw new ImagePdfError('pixels')
}
