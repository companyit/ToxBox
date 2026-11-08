import { test, expect } from 'vitest'
import mammoth from 'mammoth'
import { createDocxFixture } from '../helpers/documentFixtures'
import { imageDimensions } from '../../src/utils/docxLimits'
import { inspectDocx } from '../../src/utils/docxValidation'

test('DOCX 真实样式标题、列表、强调、表格与 PNG/JPEG 均进入转换结果', async () => {
  const buffer = await createDocxFixture()
  await expect(inspectDocx(Uint8Array.from(buffer).buffer)).resolves.toBeDefined()
  const images: string[] = []
  const result = await mammoth.convertToHtml({buffer}, {
    externalFileAccess: false, includeEmbeddedStyleMap: false,
    convertImage: mammoth.images.imgElement(async image => {
      const raw = await image.readAsArrayBuffer()
      const bytes = raw instanceof ArrayBuffer ? raw : Uint8Array.from(raw as unknown as Uint8Array).buffer
      expect(imageDimensions(bytes, image.contentType)).toEqual({width: 80, height: 40})
      images.push(image.contentType)
      return {src: `local-image-${images.length - 1}`}
    }),
  })
  expect(images).toEqual(['image/png', 'image/jpeg'])
  expect(result.messages.filter(message => message.type === 'error')).toEqual([])
  for (const fragment of ['<h1>本地转换标题</h1>', '<strong>加粗文字</strong>', '<em>斜体文字</em>', '<ol><li>编号项目甲</li><li>编号项目乙</li></ol>', '<ul><li>无序项目甲</li><li>无序项目乙</li></ul>', '<table>', '表格甲', '中文测试，第 70 段']) expect(result.value).toContain(fragment)
})
