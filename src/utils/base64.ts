export function convertBase64(input: string, decode = false): string {
  if (input.length > 100000) throw new Error('输入超过 100,000 个 UTF-16 码元，请缩短后重试。')
  if (!input) return ''
  if (!decode) {
    if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(input)) throw new Error('输入包含孤立代理项，无法编码。')
    const bytes = new TextEncoder().encode(input)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
  }
  const clean = input.replace(/[ \t\r\n]/g, '')
  if (!clean) return ''
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean)) throw new Error('Base64 格式或尾部填充无效。')
  const binary = atob(clean)
  if (btoa(binary) !== clean) throw new Error('Base64 尾部填充位无效。')
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))) }
  catch { throw new Error('解码结果不是有效的 UTF-8 文本。') }
}
