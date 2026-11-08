import { test, expect, hydrated } from './helpers'
import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs/promises'
import { createOrganizerFixture } from '../tests/helpers/pdfOrganizerFixture'
for (const width of [375, 768, 1440]) test(`ORG 本地缩略图、键盘/拖动、旋转删除与真实导出 ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 })
  const external: string[] = [], errors: string[] = []
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4177/')) external.push(request.url()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/office/pdf-organizer/'); await hydrated(page)
  const picker = page.getByLabel('选择待整理的 PDF', { exact: true })
  await picker.setInputFiles({ name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await createOrganizerFixture()) })
  const action = page.getByRole('button', { name: '导出整理后的 PDF', exact: true })
  await expect(action).toBeEnabled()
  await expect(page.locator('[data-page="0"] img')).toBeVisible()
  const source0 = page.locator('[data-page="0"] img')
  expect(await source0.evaluate((node: HTMLImageElement) => node.naturalWidth > 0)).toBe(true)
  // Drag the fifth original page to the front; keyboard alternative tested next.
  const source = page.locator('[data-page="4"] .drag-handle'), target = page.locator('[data-page="0"] .drag-handle')
  await source.scrollIntoViewIfNeeded(); await expect(page.locator('[data-page="4"] img')).toBeVisible(); await source.hover(); const start = (await source.boundingBox())!
  await page.mouse.move(start.x + 20, start.y + 12); await page.mouse.down()
  await page.mouse.move(start.x + 40, start.y + 20, { steps: 5 })
  await target.scrollIntoViewIfNeeded(); const end = (await target.boundingBox())!
  await page.mouse.move(end.x + 40, end.y + 20, { steps: 10 }); await page.mouse.move(end.x + 45, end.y + 20); await page.mouse.up()
  await expect(page.locator('#organizer-order')).toHaveText('实际页序：5, 1, 2, 3, 4, 6')
  await page.getByRole('button', { name: '原第 5 页后移', exact: true }).focus(); await page.keyboard.press('Enter')
  await expect(page.locator('[data-page="4"] .page-label')).toBeFocused()
  await page.getByRole('button', { name: '原第 5 页前移', exact: true }).click()
  await page.getByRole('button', { name: '删除原第 2 页', exact: true }).click()
  await page.getByRole('button', { name: '原第 3 页顺时针旋转', exact: true }).click()
  await expect(page.locator('#organizer-order')).toHaveText('实际页序：5, 1, 3, 4, 6')
  await action.click(); await expect(page.locator('.download')).toBeVisible()
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('link', { name: '下载 organized.pdf', exact: true }).click()
  const download = await downloadEvent; expect(download.suggestedFilename()).toBe('organized.pdf')
  await download.saveAs(info.outputPath('organized.pdf'))
  const output = await PDFDocument.load(await fs.readFile(info.outputPath('organized.pdf')))
  expect(output.getPages().map(p => [p.getWidth(), p.getRotation().angle])).toEqual([[280, 270], [240, 0], [260, 180], [270, 180], [290, 0]])
  expect(output.getPage(0).getCropBox()).toEqual({ x: 10, y: 10, width: 200, height: 320 })
  await page.screenshot({ path: info.outputPath(`organizer-${width}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '原第 3 页逆时针旋转', exact: true }).click(); await expect(page.locator('.download')).toHaveCount(0)
  await page.getByRole('button', { name: '恢复原始排列', exact: true }).click(); await page.getByRole('button', { name: '保留当前编辑', exact: true }).click()
  await expect(page.locator('.page-grid li')).toHaveCount(5)
  await page.getByRole('button', { name: '恢复原始排列', exact: true }).click(); await page.getByRole('button', { name: '确认恢复', exact: true }).click()
  await expect(page.locator('#organizer-order')).toHaveText('实际页序：1, 2, 3, 4, 5, 6')
  await page.getByRole('button', { name: '清空', exact: true }).click(); await expect(picker).toBeFocused()
  await expect(page.locator('.page-grid li')).toHaveCount(0); await expect(page.locator('img[src^="blob:"]')).toHaveCount(0)
  expect(external).toEqual([]); expect(errors).toEqual([])
})
test('ORG 搜索及独立文档、单页保护、损坏/超限拒绝与离页清理', async ({ page }) => {
  await page.goto('/'); await hydrated(page)
  await page.evaluate(() => { (window as unknown as { organizerMarker: boolean }).organizerMarker = true })
  await page.getByLabel('搜索工具', { exact: true }).fill('PDF 页面整理')
  await Promise.all([page.waitForURL('http://127.0.0.1:4177/office/pdf-organizer/', { waitUntil: 'load' }), page.getByRole('link', { name: '试用工具 ：PDF 页面整理', exact: true }).click()]); await hydrated(page)
  expect(await page.evaluate(() => (window as unknown as { organizerMarker?: boolean }).organizerMarker)).toBeUndefined()
  await expect(page.locator('#workdev-google-tag')).toHaveCount(0)
  const picker = page.getByLabel('选择待整理的 PDF', { exact: true })
  await picker.setInputFiles({ name: 'single.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await createOrganizerFixture(1)) })
  await expect(page.getByRole('button', { name: '删除原第 1 页', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '导出整理后的 PDF', exact: true })).toBeEnabled()
  await picker.setInputFiles({ name: 'large.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await createOrganizerFixture(101)) })
  await expect(page.locator('.organizer')).toContainText('PDF 检查或导出失败'); await expect(page.locator('.page-grid li')).toHaveCount(0)
  await picker.setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-broken') })
  await expect(page.locator('.organizer')).toContainText('PDF 检查或导出失败')
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect(picker).toHaveValue(''); await expect(page.locator('.page-grid li')).toHaveCount(0)
})
test('ORG 按需渲染、缓存URL释放与100页滚动', async ({ page }) => {
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL), live = new Set<string>()
    ;(window as unknown as { organizerUrls: Set<string> }).organizerUrls = live
    URL.createObjectURL = value => { const url = original(value); live.add(url); return url }
    URL.revokeObjectURL = url => { live.delete(url); revoke(url) }
  })
  await page.goto('/office/pdf-organizer/'); await hydrated(page)
  await page.getByLabel('选择待整理的 PDF', { exact: true }).setInputFiles({ name: '100.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await createOrganizerFixture(100)) })
  await expect(page.getByRole('button', { name: '导出整理后的 PDF', exact: true })).toBeEnabled()
  await expect(page.locator('[data-page="0"] img')).toBeVisible()
  await expect(page.locator('[data-page="99"] img')).toHaveCount(0)
  for (const index of [20, 40, 60, 80, 99]) {
    await page.locator(`[data-page="${index}"]`).scrollIntoViewIfNeeded()
    await expect(page.locator(`[data-page="${index}"] img`)).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { organizerUrls: Set<string> }).organizerUrls.size)).toBeLessThanOrEqual(24)
  }
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as { organizerUrls: Set<string> }).organizerUrls.size)).toBe(0)
})
