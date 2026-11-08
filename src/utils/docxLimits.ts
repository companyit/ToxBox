export const DOCX_LIMITS = { file: 10 * 1024 ** 2, entries: 1000, expanded: 50 * 1024 ** 2, xml: 10 * 1024 ** 2, images: 100, imageBytes: 20 * 1024 ** 2, pixels: 20000000, text: 500000, nodes: 50000 }
function reject(): never { throw Error('DOCX 格式不受支持、内容损坏或超过安全限额。') }
export interface DocxImage { id: string; type: string; bytes: ArrayBuffer }
export function imageDimensions(buffer: ArrayBuffer, type: string) {
  const b = new Uint8Array(buffer), v = new DataView(buffer)
  let width = 0, height = 0
  if (type === 'image/png' && b.length >= 24 && [137,80,78,71,13,10,26,10].every((x, i) => b[i] === x) && String.fromCharCode(...b.slice(12,16)) === 'IHDR') { width = v.getUint32(16); height = v.getUint32(20) }
  else if (type === 'image/jpeg' && b[0] === 255 && b[1] === 216) {
    let i = 2
    while (i + 4 <= b.length) {
      if (b[i++] !== 255) reject()
      while (b[i] === 255) i++
      const marker = b[i++]!
      if (marker === 217 || marker === 218) break
      const length = v.getUint16(i)
      if (length < 2 || i + length > b.length) reject()
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { if (length < 8) reject(); height = v.getUint16(i + 3); width = v.getUint16(i + 5); break }
      i += length
    }
  }
  if (!width || !height || width * height > DOCX_LIMITS.pixels) reject()
  return { width, height }
}
