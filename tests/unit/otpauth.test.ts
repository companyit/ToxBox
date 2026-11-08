import { expect, test } from 'vitest'
import { parseOtpauth } from '../../src/utils/otpauth'
const prefix = 'otpauth://totp/Example:alice?secret=MY'
test('默认参数、编码标签及显式参数识别', () => {
  expect(parseOtpauth(prefix)).toEqual({ secret: 'MY', account: 'alice', issuer: 'Example', algorithm: 'SHA-1', digits: 6, period: 30 })
  expect(parseOtpauth('otpauth://totp/ACME%20Co%3Aalice%40example.com?secret=MY&issuer=ACME%20Co&algorithm=SHA512&digits=8&period=60')).toMatchObject({ account: 'alice@example.com', issuer: 'ACME Co', algorithm: 'SHA-512', digits: 8, period: 60 })
  expect(parseOtpauth(prefix + '&algorithm=SHA256&period=1').period).toBe(1)
  expect(parseOtpauth(prefix + '&period=300').period).toBe(300)
})
test('拒绝不支持、歧义及非法链接且错误不回显输入', () => {
  for (const bad of [
    '', 'https://example.com/?secret=PRIVATE', prefix.replace('totp/', 'hotp/'), prefix.replace('Example:alice', ''),
    prefix + '&secret=MY', prefix + '&digits=7', prefix + '&algorithm=MD5', prefix + '&period=0', prefix + '&period=301',
    prefix + '&period=30.5', prefix + '&period=03', prefix + '&period=1e2', prefix + '&issuer=Other', prefix + '&issuer=',
    prefix + '&counter=1', prefix + '#PRIVATE', prefix + '&unknown=PRIVATE', prefix.replace('MY','PRIVATE0'),
    prefix.replace('alice','%FF'), prefix.replace('alice','%XX'), prefix.replace('alice','%00'), prefix.replace('alice','a:b'),
    prefix.replace('alice','a%2Fb'), prefix.replace('Example:alice','a/../alice'), prefix.replace('totp/', 'user@totp/'), prefix + '&issuer=%0A', 'A'.repeat(4097),
  ]) {
    expect(() => parseOtpauth(bad)).toThrow()
    try { parseOtpauth(bad) } catch (error) { expect((error as Error).message).not.toContain('PRIVATE') }
  }
})
