import { expect, hydrated, test } from './helpers'

test('日期按分钟换算，可填写秒和毫秒或粘贴旧格式', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/developer/timestamp/')
  await hydrated(page)
  const direction = page.getByLabel('转换方向')
  await direction.focus()
  await direction.selectOption('to-timestamp')
  await expect(direction).toBeFocused()
  await expect(page.locator('#local-input-hint')).toContainText('YYYY-MM-DD HH:mm')
  await expect(page.locator('#local-result-context')).toHaveText('Unix 时间戳 · 秒')
  const input = page.locator('#local-input')
  const output = page.locator('#local-result')
  const run = page.getByRole('button', { name: '转换', exact: true })
  const picker = page.locator('#time-picker')
  await picker.fill('1970-01-01T00:01')
  await expect(input).toHaveValue('1970-01-01 00:01')
  await run.press('Enter')
  await expect(output).toHaveValue('60')
  await page.getByText('填写秒和毫秒（可选）', { exact: true }).click()
  await page.getByLabel('秒', { exact: true }).fill('2')
  await page.getByLabel('毫秒', { exact: true }).fill('3')
  await expect(output).toHaveValue('')
  await page.getByLabel('时间戳单位').selectOption('milliseconds')
  await run.click()
  await expect(output).toHaveValue('62003')
  await expect(page.locator('#local-result-context')).toHaveText('Unix 时间戳 · 毫秒')
  await page.getByRole('button', { name: '填入示例' }).click()
  await expect(page.getByLabel('秒', { exact: true })).toHaveValue('')
  await run.click()
  await expect(output).toHaveValue('60000')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  await page.getByLabel('时间戳单位').selectOption('seconds')
  await page.getByLabel('时区').selectOption('8')
  await input.fill('1970-01-01 08:01')
  await expect(picker).toHaveValue('1970-01-01T08:01')
  await run.click()
  await expect(output).toHaveValue('60')
  await input.fill('1970-01-01 08:01:02.003')
  await page.getByLabel('时间戳单位').selectOption('milliseconds')
  await run.click()
  await expect(output).toHaveValue('62003')
  await input.fill('1970-02-30 08:01')
  await run.click()
  await expect(page.locator('#local-status')).toContainText('日期或时间无效')
  await expect(input).toHaveValue('1970-02-30 08:01')
  await expect(picker).toHaveValue('')
  await picker.fill('1970-01-01T08:02')
  await expect(input).toHaveValue('1970-01-01 08:02')
  await run.click()
  await expect(output).toHaveValue('120000')
})

test('结果在宽窄屏都独占输入下方的一行', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/developer/timestamp/')
  await hydrated(page)
  await page.getByLabel('转换方向').selectOption('to-timestamp')
  const input = page.locator('#local-input')
  const picker = page.locator('#time-picker')
  const result = page.locator('#local-result')
  const desktopInput = (await input.boundingBox())!
  const desktopPicker = (await picker.boundingBox())!
  const desktopResult = (await result.boundingBox())!
  expect(desktopPicker.x).toBeGreaterThan(desktopInput.x + desktopInput.width)
  expect(desktopResult.y).toBeGreaterThan(desktopPicker.y + desktopPicker.height)
  expect(desktopResult.width).toBeGreaterThan(desktopPicker.width)
  await page.setViewportSize({ width: 375, height: 800 })
  const mobileInput = (await input.boundingBox())!
  const mobilePicker = (await picker.boundingBox())!
  const mobileResult = (await result.boundingBox())!
  expect(mobilePicker.y).toBeGreaterThan(mobileInput.y + mobileInput.height)
  expect(mobileResult.y).toBeGreaterThan(mobilePicker.y + mobilePicker.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})


test('首次打开时输入和结果文本框容纳四行且没有内部滚动', async ({ page }) => {
  await page.goto('/developer/timestamp/')
  await hydrated(page)
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 800 })
    for (const id of ['local-input', 'local-result']) {
      const box = page.locator('#' + id)
      const metrics = await box.evaluate(element => {
        const style = getComputedStyle(element)
        return {
          lines: (element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) / parseFloat(style.lineHeight),
          scrolls: element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth,
        }
      })
      expect(metrics.lines).toBeGreaterThanOrEqual(3.95)
      expect(metrics.scrolls).toBe(false)
    }
  }
})
