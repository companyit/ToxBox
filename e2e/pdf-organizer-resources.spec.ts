import { test, expect, hydrated } from './helpers'
import { createAdvancedOrganizerFixture } from '../tests/helpers/pdfOrganizerAdvancedFixture'
for (const kind of ['jpx', 'cmyk', 'cmap'] as const) test(`ORG 真实${kind}解码与同源资源`, async ({ page }, info) => {
  const resources: string[] = [], external: string[] = []
  page.on('request', request => {
    if (request.url().includes('/pdf-assets/')) resources.push(new URL(request.url()).pathname)
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4177/')) external.push(request.url())
  })
  await page.goto('/office/pdf-organizer/'); await hydrated(page)
  await page.getByLabel('选择待整理的 PDF', { exact: true }).setInputFiles({ name: `${kind}-synthetic.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(await createAdvancedOrganizerFixture(kind)) })
  const image = page.locator('[data-page="0"] img'); await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true)
  const pixels = await image.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0)
    let red = 0, blue = 0, dark = 0
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]! > 100 && data[i]! > data[i + 1]! * 1.5 && data[i]! > data[i + 2]! * 1.5) red++
      if (data[i + 2]! > 100 && data[i + 2]! > data[i]! * 1.5 && data[i + 2]! > data[i + 1]! * 1.5) blue++
      if (data[i]! < 200 && data[i + 1]! < 200 && data[i + 2]! < 200) dark++
    }
    return { red, blue, dark }
  })
  if (kind === 'jpx') { expect(resources).toContain('/pdf-assets/wasm/openjpeg.wasm'); expect(pixels.red).toBeGreaterThan(1000); expect(pixels.blue).toBeGreaterThan(1000) }
  if (kind === 'cmyk') { expect(resources).toContain('/pdf-assets/wasm/qcms_bg.wasm'); expect(resources).toContain('/pdf-assets/iccs/CGATS001Compat-v2-micro.icc'); expect(pixels.red).toBeGreaterThan(1000) }
  if (kind === 'cmap') { expect(resources).toContain('/pdf-assets/cmaps/UniGB-UCS2-H.bcmap'); expect(pixels.dark).toBeGreaterThan(100) }
  expect(external).toEqual([])
  await page.screenshot({ path: info.outputPath(`${kind}.png`), fullPage: true })
  await info.attach('resource-check', { body: JSON.stringify({ kind, resources, external, pixels }, null, 2), contentType: 'application/json' })
})
for (const kind of ['oversize', 'broken-jpx'] as const) test(`ORG ${kind}明确预览失败、可重试、清空不留旧图`, async ({ page }) => {
  await page.goto('/office/pdf-organizer/'); await hydrated(page)
  await page.getByLabel('选择待整理的 PDF', { exact: true }).setInputFiles({ name: `${kind}-synthetic.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(await createAdvancedOrganizerFixture(kind)) })
  await expect(page.locator('[data-page="0"]')).toContainText('缩略图不可用')
  await expect(page.locator('[data-page="0"] img')).toHaveCount(0)
  await page.getByRole('button', { name: '原第 1 页顺时针旋转', exact: true }).click()
  await expect(page.locator('[data-page="0"]')).toContainText('缩略图不可用')
  await expect(page.locator('[data-page="0"] img')).toHaveCount(0)
  await page.getByRole('button', { name: '重试缩略图', exact: true }).click()
  await expect(page.locator('[data-page="0"]')).toContainText('缩略图不可用')
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(page.locator('.page-grid li')).toHaveCount(0)
})

test('ORG 合法空白页保持可预览与导出，不用白色像素判失败', async ({ page }) => {
  await page.goto('/office/pdf-organizer/'); await hydrated(page)
  await page.getByLabel('选择待整理的 PDF', { exact: true }).setInputFiles({ name: 'blank-synthetic.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await createAdvancedOrganizerFixture('blank')) })
  const image = page.locator('[data-page="0"] img'); await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true)
  expect(await image.evaluate((node: HTMLImageElement) => {
    const canvas = document.createElement('canvas'); canvas.width = node.naturalWidth; canvas.height = node.naturalHeight
    const context = canvas.getContext('2d')!; context.drawImage(node, 0, 0)
    return Array.from(context.getImageData(100, 100, 1, 1).data)
  })).toEqual([255, 255, 255, 255])
  await expect(page.locator('[data-page="0"]')).not.toContainText('缩略图不可用')
  await page.getByRole('button', { name: '导出整理后的 PDF', exact: true }).click()
  await expect(page.getByRole('link', { name: '下载 organized.pdf', exact: true })).toBeVisible()
})
