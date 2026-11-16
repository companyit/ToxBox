import { expect, test } from 'vitest'
import { decodeFileText, validateTextFile, FILE_TEXT_BYTES } from '../../src/utils/fileText'
const bytes = (text: string) => new TextEncoder().encode(text)
test('严格UTF-8及开头BOM、空文件、中文和换行规范化', () => {
  expect(decodeFileText(bytes('\uFEFF甲😀\r\n乙\r'))).toEqual({text:'甲😀\n乙\n',lines:3})
  expect(decodeFileText(new Uint8Array())).toEqual({text:'',lines:0})
  expect(decodeFileText(bytes('a\n'))).toEqual({text:'a\n',lines:2})
  expect(decodeFileText(bytes('a\uFEFFb')).text).toBe('a\uFEFFb')
})
test('拒绝坏UTF8、UTF16和不支持控制字符，不替换坏字节', () => {
  for(const data of [[0xff,0xfe,65,0],[0xfe,0xff,0,65],[0xc0,0xaf],[0xe4,0xb8],[0xed,0xa0,0x80]]) expect(()=>decodeFileText(new Uint8Array(data))).toThrow('encoding')
  for(const value of ['a\0b','\u0001','\u000b','\u007f']) expect(()=>decodeFileText(bytes(value))).toThrow('binary')
  expect(decodeFileText(bytes('\t\n'))).toEqual({text:'\t\n',lines:2})
})
test('文件扩展名和字节限制不依赖MIME，空文件可接受', () => {
  for(const name of ['x.TXT','x.md','x.markdown','x.csv','x.json']) expect(()=>validateTextFile(name,0)).not.toThrow()
  for(const name of ['x.pdf','x.docx','x.txt.exe','x']) expect(()=>validateTextFile(name,1)).toThrow('extension')
  expect(()=>validateTextFile('x.txt',FILE_TEXT_BYTES)).not.toThrow()
  expect(()=>validateTextFile('x.txt',FILE_TEXT_BYTES+1)).toThrow('size')
  expect(()=>decodeFileText(new Uint8Array(FILE_TEXT_BYTES+1))).toThrow('size')
})
test('解码后码元及行数限制独立检查且不截断', () => {
  expect(decodeFileText(bytes('甲'.repeat(500000))).text).toHaveLength(500000)
  expect(()=>decodeFileText(bytes('甲'.repeat(500001)))).toThrow('input')
  expect(decodeFileText(bytes('\n'.repeat(4999))).lines).toBe(5000)
  expect(()=>decodeFileText(bytes('\n'.repeat(5000)))).toThrow('lines')
})
