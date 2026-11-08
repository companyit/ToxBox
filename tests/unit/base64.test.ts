import { test, expect } from 'vitest'
import { convertBase64 } from '../../src/utils/base64'
test('UTF-8、BOM 和非 BMP 往返', () => {
  expect(convertBase64('你好')).toBe('5L2g5aW9')
  expect(convertBase64('hello')).toBe('aGVsbG8=')
  expect(convertBase64('a'.repeat(100000))).toHaveLength(133336)
  for (const text of ['', '😀\uFEFF', '\uFEFF你好', 'a'.repeat(75000)]) expect(convertBase64(convertBase64(text), true)).toBe(text)
})
test('严格拒绝非法编码及边界', () => {
  for (const text of ['Zh==', 'Zg=', 'Zg===', '-_==', '/w==']) expect(() => convertBase64(text, true)).toThrow()
  expect(convertBase64(' Zg==\n', true)).toBe('f')
  expect(() => convertBase64('\ud800')).toThrow()
  expect(() => convertBase64('a'.repeat(100001))).toThrow()
})
