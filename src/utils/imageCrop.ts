import { checkConvertPixels, type ImageFormat } from './imageConvert'
export interface Size { width: number; height: number }
export interface CropRect extends Size { x: number; y: number }
export type CropRatio = 'free' | '1:1' | '4:3' | '16:9'
export type Corner = 'nw' | 'ne' | 'sw' | 'se'
export interface CropOptions { rect: CropRect; ratio: CropRatio; axis: 'width' | 'height'; size: number; format: ImageFormat; quality: number }
export const cropErrors = {
  rect: '请填写图内有效的整数坐标和宽高；宽高至少 1 像素，先修正输入再生成。',
  ratio: '当前图片或位置无法容纳所选整数比例，请调整裁剪框。',
  size: '输出主尺寸须为正整数，不能超过当前裁剪尺寸；仅支持等比缩小。',
  options: '请选择有效输出格式，质量须为 10～100 的整数。',
  files: '请选择一张非空静态 JPG、PNG 或 WebP，大小不超过 10 MiB。',
  pixels: '单边最多 10000 像素，图片最多 2000 万像素。',
  format: '图片损坏或格式不支持；请使用静态 JPG、普通 8 位非隔行 PNG 或 WebP，不支持动画或 CMYK JPEG。',
  capability: '当前浏览器不支持所选格式的本地处理，请更新浏览器或改用 PNG/JPG。',
  output: '输出超过 100 MiB，请缩小尺寸后重试。',
  failed: '图片处理失败，请检查图片后重试。',
} as const
export type CropCode = keyof typeof cropErrors
export class ImageCropError extends Error { constructor(public readonly code: CropCode) { super(code) } }
const fail = (code: CropCode): never => { throw new ImageCropError(code) }
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
export function ratioUnits(ratio: CropRatio): [number, number] | undefined {
  if (ratio === 'free') return undefined
  if (ratio === '1:1') return [1, 1]
  if (ratio === '4:3') return [4, 3]
  if (ratio === '16:9') return [16, 9]
  return fail('ratio')
}
export function validateCropRect(rect: CropRect, image: Size, ratio: CropRatio = 'free') {
  checkConvertPixels(image.width, image.height)
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) || rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1 || rect.x + rect.width > image.width || rect.y + rect.height > image.height) fail('rect')
  const units = ratioUnits(ratio)
  if (units && (rect.width % units[0] || rect.height % units[1] || rect.width / units[0] !== rect.height / units[1])) fail('ratio')
}
export function fitCropRatio(rect: CropRect, image: Size, ratio: CropRatio): CropRect {
  validateCropRect(rect, image)
  const units = ratioUnits(ratio)
  if (!units) return { ...rect }
  const [p, q] = units, k = Math.floor(Math.min(image.width / p, image.height / q))
  if (k < 1) return fail('ratio')
  const width = p * k, height = q * k
  return { x: clamp(Math.floor(rect.x + rect.width / 2 - width / 2), 0, image.width - width), y: clamp(Math.floor(rect.y + rect.height / 2 - height / 2), 0, image.height - height), width, height }
}
export function quantizeCrop(rect: CropRect, image: Size, ratio: CropRatio, axis: 'width' | 'height'): CropRect {
  const units = ratioUnits(ratio)
  if (!units) { validateCropRect(rect, image); return { ...rect } }
  const value = rect[axis]
  if (!Number.isInteger(value) || value < 1) return fail('rect')
  const k = Math.floor(value / units[axis === 'width' ? 0 : 1])
  if (k < 1) return fail('ratio')
  const result = { ...rect, width: units[0] * k, height: units[1] * k }
  validateCropRect(result, image, ratio)
  return result
}
export function cropOutput(rect: CropRect, axis: 'width' | 'height', size: number): Size {
  if (!['width', 'height'].includes(axis) || !Number.isInteger(size) || size < 1 || size > rect[axis]) return fail('size')
  const result = axis === 'width' ? { width: size, height: Math.max(1, Math.round(rect.height * size / rect.width)) } : { height: size, width: Math.max(1, Math.round(rect.width * size / rect.height)) }
  checkConvertPixels(result.width, result.height)
  return result
}
export function validateCropOptions(options: CropOptions, image: Size) {
  validateCropRect(options.rect, image, options.ratio)
  if (!['png', 'jpeg', 'webp'].includes(options.format) || !Number.isInteger(options.quality) || options.quality < 10 || options.quality > 100) fail('options')
  return cropOutput(options.rect, options.axis, options.size)
}
export function imagePoint(clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }, image: Size) {
  if (bounds.width <= 0 || bounds.height <= 0) return fail('rect')
  return { x: (clientX - bounds.left) * image.width / bounds.width, y: (clientY - bounds.top) * image.height / bounds.height }
}
export function dragCrop(start: CropRect, image: Size, ratio: CropRatio, handle: 'move' | Corner, dx: number, dy: number): CropRect {
  validateCropRect(start, image, ratio)
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return fail('rect')
  if (handle === 'move') return { ...start, x: clamp(Math.round(start.x + dx), 0, image.width - start.width), y: clamp(Math.round(start.y + dy), 0, image.height - start.height) }
  const west = handle.includes('w'), north = handle.includes('n'), sx = west ? -1 : 1, sy = north ? -1 : 1
  const ax = west ? start.x + start.width : start.x, ay = north ? start.y + start.height : start.y
  const maxW = west ? ax : image.width - ax, maxH = north ? ay : image.height - ay
  const units = ratioUnits(ratio)
  let width: number, height: number
  if (units) {
    const [p, q] = units, limit = Math.floor(Math.min(maxW / p, maxH / q))
    const k = clamp(Math.round(((start.width + sx * dx) * p + (start.height + sy * dy) * q) / (p * p + q * q)), 1, limit)
    width = p * k; height = q * k
  } else { width = clamp(Math.round(start.width + sx * dx), 1, maxW); height = clamp(Math.round(start.height + sy * dy), 1, maxH) }
  return { x: west ? ax - width : ax, y: north ? ay - height : ay, width, height }
}
