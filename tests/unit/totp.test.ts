import { expect, test } from 'vitest'
import { decodeTotpSecret, generateTotp } from '../../src/utils/totp'
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
test('RFC 6238 SHA-1 向量截取为六位，保留前导零', async () => {
  for (const [seconds, expected] of [[59,'287082'], [1111111109,'081804'], [1111111111,'050471'], [1234567890,'005924'], [2000000000,'279037'], [20000000000,'353130']] as const) {
    expect(await generateTotp(secret, seconds * 1000)).toBe(expected)
  }
  expect(await generateTotp(secret, 29999)).toBe(await generateTotp(secret, 0))
  expect(await generateTotp(secret, 30000)).not.toBe(await generateTotp(secret, 29999))
})
test('严格 Base32 解码与输入限制', () => {
  expect([...decodeTotpSecret('my======')]).toEqual([102])
  expect(decodeTotpSecret('GEZD GNBV\nGY3TQOJQ')).toEqual(new TextEncoder().encode('1234567890'))
  for (const bad of ['', 'A', 'MZ', 'MY=', 'MY=======', 'MY======A', '0189', 'A'.repeat(1025)]) expect(() => decodeTotpSecret(bad)).toThrow()
})

test('无安全计算能力或设备时间非法时拒绝生成', async () => {
  await expect(generateTotp(secret, 59000, undefined as unknown as SubtleCrypto)).resolves.toBe('287082')
  await expect(generateTotp(secret, 59000, null as unknown as SubtleCrypto)).rejects.toThrow('安全计算')
  for (const time of [-1, NaN, Infinity, 1.5]) await expect(generateTotp(secret, time)).rejects.toThrow('设备时间')
})

test('RFC 6238 SHA-256/SHA-512 八位参数向量', async () => {
  const keys = { 'SHA-256': 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA', 'SHA-512': 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA' }
  const vectors = [[59, '46119246', '90693936'], [1111111109, '68084774', '25091201'], [1111111111, '67062674', '99943326'], [1234567890, '91819424', '93441116'], [2000000000, '90698825', '38618901'], [20000000000, '77737706', '47863826']] as const
  for (const [time, sha256, sha512] of vectors) {
    expect(await generateTotp(keys['SHA-256'], time * 1000, undefined, { algorithm: 'SHA-256', digits: 8, period: 30 })).toBe(sha256)
    expect(await generateTotp(keys['SHA-512'], time * 1000, undefined, { algorithm: 'SHA-512', digits: 8, period: 30 })).toBe(sha512)
  }
  expect(await generateTotp(secret, 59000, undefined, { algorithm: 'SHA-1', digits: 8, period: 60 })).toBe('84755224')
})
