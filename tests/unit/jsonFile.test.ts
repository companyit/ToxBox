import { expect, test } from 'vitest'
import { validateJsonFile, decodeJsonFile, JSON_FILE_BYTES } from '../../src/utils/jsonFile'
const bytes = (text: string) => new TextEncoder().encode(text)
test('JSON文件扩展名与原始字节预算独立校验', () => {
  expect(() => validateJsonFile('内容.JSON', JSON_FILE_BYTES)).not.toThrow()
  expect(() => validateJsonFile('a.json', 0)).not.toThrow()
  for (const name of ['a.txt', 'a.json.exe', '', 'a.json ']) expect(() => validateJsonFile(name, 1)).toThrow('extension')
  for (const size of [-1, 1.5, NaN, Infinity, JSON_FILE_BYTES + 1]) expect(() => validateJsonFile('a.json', size)).toThrow('size')
  expect(() => decodeJsonFile(new Uint8Array(JSON_FILE_BYTES + 1))).toThrow('size')
})
test('UTF-8原文、BOM、换行、大整数和空文件均不改写或提前解析', () => {
  for (const text of ['', '\uFEFF{\r\n"id":9007199254740993,\r"name":"中文😀"\n}', '{"a":1,"a":2}', 'INVALID', '\u0000']) expect(decodeJsonFile(bytes(text))).toBe(text)
})
test('拒绝坏UTF-8、UTF-16、过长编码和代理项编码，不作替换字符修复', () => {
  for (const value of [[0xff, 0xfe], [0xc4, 0xe3], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xe2, 0x82]]) expect(() => decodeJsonFile(Uint8Array.from(value))).toThrow('encoding')
})
test('码元上限独立于字节数，中文和代理对边界正确', () => {
  expect(decodeJsonFile(bytes('中'.repeat(100000)))).toHaveLength(100000)
  expect(decodeJsonFile(bytes('😀'.repeat(50000)))).toHaveLength(100000)
  expect(() => decodeJsonFile(bytes('x'.repeat(100001)))).toThrow('input')
  expect(() => decodeJsonFile(bytes('😀'.repeat(50000) + 'x'))).toThrow('input')
})
