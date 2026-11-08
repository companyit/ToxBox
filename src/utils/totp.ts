export interface TotpOptions { readonly algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'; readonly digits: 6 | 8; readonly period: number }
export const defaultTotpOptions: TotpOptions = Object.freeze({ algorithm: 'SHA-1', digits: 6, period: 30 })
export function validateTotpOptions(options: TotpOptions) {
  if (!['SHA-1', 'SHA-256', 'SHA-512'].includes(options.algorithm) || ![6, 8].includes(options.digits) || !Number.isInteger(options.period) || options.period < 1 || options.period > 300) throw new Error('验证码参数无效。')
}
/** RFC 4648 Base32；只接受完整字节与零填充尾位。 */
export function decodeTotpSecret(raw: string): Uint8Array<ArrayBuffer> {
  if (raw.length > 1024) throw new Error('密钥不能超过 1024 个字符。')
  const value = raw.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z2-7]+={0,6}$/.test(value)) throw new Error('请输入有效的 Base32 密钥（字母 A–Z 和数字 2–7）。')
  const content = value.replace(/=+$/, '')
  const remainder = content.length % 8
  const padding = value.length - content.length
  if (![0, 2, 4, 5, 7].includes(remainder) || (padding && (value.length % 8 !== 0 || padding !== (8 - remainder) % 8))) {
    throw new Error('密钥长度或末尾填充无效。')
  }
  const result = new Uint8Array(Math.floor(content.length * 5 / 8))
  let bits = 0, buffer = 0, index = 0
  for (const char of content) {
    buffer = (buffer << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char)
    bits += 5
    if (bits >= 8) { bits -= 8; result[index++] = (buffer >> bits) & 255; buffer &= (1 << bits) - 1 }
  }
  if (!result.length || buffer !== 0) throw new Error('密钥尾部编码无效。')
  return result
}
export async function generateTotp(secret: string, time = Date.now(), subtle: SubtleCrypto = globalThis.crypto?.subtle, options: TotpOptions = defaultTotpOptions): Promise<string> {
  if (!subtle) throw new Error('当前浏览器无法使用安全计算，请在 HTTPS 环境中重试。')
  if (!Number.isSafeInteger(time) || time < 0) throw new Error('设备时间无效，请检查系统时间。')
  validateTotpOptions(options)
  const bytes = decodeTotpSecret(secret)
  try {
    const key = await subtle.importKey('raw', bytes, { name: 'HMAC', hash: options.algorithm }, false, ['sign'])
    const counter = new Uint8Array(8)
    new DataView(counter.buffer).setBigUint64(0, BigInt(Math.floor(time / (options.period * 1000))))
    const signature = new Uint8Array(await subtle.sign('HMAC', key, counter))
    const offset = signature[signature.length - 1]! & 15
    const number = new DataView(signature.buffer).getUint32(offset) & 0x7fffffff
    return String(number % (10 ** options.digits)).padStart(options.digits, '0')
  } finally { bytes.fill(0) }
}
