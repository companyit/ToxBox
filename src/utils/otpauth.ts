import { decodeTotpSecret, validateTotpOptions, type TotpOptions } from './totp'
export interface ImportedTotp extends TotpOptions { secret: string; account: string; issuer: string }
/** URI 仅作为数据解析；异常消息不得携带原始输入。 */
export function parseOtpauth(raw: string): ImportedTotp {
  const invalid = () => new Error('导入链接无效，请检查 TOTP 类型、密钥及参数。')
  if (raw.length > 4096) throw new Error('导入链接不能超过 4096 个字符。')
  const value = raw.trim()
  if (/[\u0000-\u0020\u007f]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) throw invalid()
  let url: URL
  try { decodeURIComponent(value); url = new URL(value) } catch { throw invalid() }
  if (url.protocol !== 'otpauth:' || url.hostname !== 'totp' || url.username || url.password || url.port || value.includes('#')) throw invalid()
  const allowed = new Set(['secret', 'issuer', 'algorithm', 'digits', 'period'])
  const seen = new Set<string>()
  for (const [key, entry] of url.searchParams) {
    if (!allowed.has(key) || seen.has(key) || !entry || /[\u0000-\u001f\u007f]/.test(entry)) throw invalid()
    seen.add(key)
  }
  const secret = url.searchParams.get('secret') ?? ''
  try { decodeTotpSecret(secret).fill(0) } catch { throw invalid() }
  let label: string
  // 使用原始路径，避免 URL 对点路径的规范化隐藏多段标签。
  const rawLabel = value.match(/^otpauth:\/\/[^/?#]+\/([^?#]*)/i)?.[1]
  try { label = decodeURIComponent(rawLabel ?? '') } catch { throw invalid() }
  if (!label || /[\/\u0000-\u001f\u007f]/.test(label)) throw invalid()
  const parts = label.split(':')
  if (parts.length > 2) throw invalid()
  const prefix = parts.length === 2 ? parts[0]!.trim() : ''
  const account = parts.at(-1)!.trim()
  const issuer = url.searchParams.get('issuer') ?? prefix
  if (!account || (parts.length === 2 && !prefix) || issuer.includes(':') || (prefix && issuer !== prefix)) throw invalid()
  const algorithm = url.searchParams.get('algorithm') ?? 'SHA1'
  const digits = url.searchParams.get('digits') ?? '6'
  const period = url.searchParams.get('period') ?? '30'
  if (!['SHA1', 'SHA256', 'SHA512'].includes(algorithm) || !['6', '8'].includes(digits) || !/^[1-9]\d{0,2}$/.test(period)) throw invalid()
  const options = { algorithm: algorithm.replace('SHA', 'SHA-'), digits: Number(digits), period: Number(period) } as TotpOptions
  try { validateTotpOptions(options) } catch { throw new Error('链接参数不支持：算法须为 SHA1/256/512，位数须为 6 或 8，周期须为 1～300 秒。') }
  return { ...options, secret, account, issuer }
}
