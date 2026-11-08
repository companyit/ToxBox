// ZIP 使用 IEEE CRC32；保持未取反的状态，支持受限解压流逐块更新。
const table = new Uint32Array(256)
for (let byte = 0; byte < table.length; byte++) {
  let value = byte
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  table[byte] = value >>> 0
}
export function updateCrc32(state: number, bytes: Uint8Array): number {
  for (const byte of bytes) state = table[(state ^ byte) & 0xff]! ^ (state >>> 8)
  return state >>> 0
}
export function finishCrc32(state: number): number { return (state ^ 0xffffffff) >>> 0 }
