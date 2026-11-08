export function generateUuids(input: string, random: (bytes: Uint8Array<ArrayBuffer>) => void): string {
  if (!/^\d{1,3}$/.test(input) || Number(input) < 1 || Number(input) > 100) throw new Error('请输入 1～100 的十进制整数数量。')
  const output: string[] = []
  for (let i=0; i<Number(input); i++) {
    const bytes = new Uint8Array(16)
    random(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('')
    output.push(`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`)
  }
  return output.join('\n')
}
