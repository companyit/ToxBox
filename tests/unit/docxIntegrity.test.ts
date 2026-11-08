import { expect, test } from 'vitest'
import JSZip from 'jszip'
import { inspectDocx } from '../../src/utils/docxValidation'
async function fixture(compression: 'STORE' | 'DEFLATE') {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('word/document.xml', '<document>original text</document>')
  return zip.generateAsync({ type: 'arraybuffer', compression })
}
for (const compression of ['STORE', 'DEFLATE'] as const) {
  test(`DOCX ${compression} 正常校验通过，目录 CRC 错误拒绝`, async () => {
    const buffer = await fixture(compression)
    await expect(inspectDocx(buffer)).resolves.toBeDefined()
    const damaged = buffer.slice(0), view = new DataView(damaged)
    for (let i = 0; i <= damaged.byteLength - 46; i++) {
      if (view.getUint32(i, true) === 0x02014b50) {
        view.setUint32(i + 16, view.getUint32(i + 16, true) ^ 1, true)
        break
      }
    }
    await expect(inspectDocx(damaged)).rejects.toThrow()
  })
}
test('DOCX 无压缩正文被修改但仍是合法文本时拒绝', async () => {
  const bytes = new Uint8Array(await fixture('STORE'))
  const word = new TextEncoder().encode('original text')
  const index = bytes.findIndex((_, i) => word.every((value, j) => bytes[i + j] === value))
  expect(index).toBeGreaterThan(0); bytes[index] = 88
  await expect(inspectDocx(bytes.buffer)).rejects.toThrow()
})

test('ZIP CRC32 标准向量与分块结果一致', async () => {
  const { updateCrc32, finishCrc32 } = await import('../../src/utils/crc32')
  const bytes = new TextEncoder().encode('123456789')
  expect(finishCrc32(updateCrc32(0xffffffff, bytes))).toBe(0xcbf43926)
  expect(finishCrc32(updateCrc32(updateCrc32(0xffffffff, bytes.slice(0, 4)), bytes.slice(4)))).toBe(0xcbf43926)
})
