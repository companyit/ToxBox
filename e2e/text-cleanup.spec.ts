import { test, expect, hydrated } from './helpers'

for (const width of [375, 768, 1440]) {
  test(`CLEAN 六种操作、输入保留与空结果 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/office/text-cleanup/'); await hydrated(page)
    await expect(page.locator('.site-header nav a[href="/office/"]')).toHaveAttribute('aria-current', 'page')
    const input = page.getByLabel('待整理文本', { exact: true })
    const result = page.getByLabel('整理结果（只读）', { exact: true })
    const operation = page.getByLabel('整理操作', { exact: true })
    for (const [mode, source, expected] of [
      ['trim', '  甲 乙 \n\t丙\t', '甲 乙\n丙'],
      ['remove-empty', '  甲 \n \n乙\n', '  甲 \n乙'],
      ['dedupe', 'A\na\nA \nA', 'A\na\nA '],
      ['ascending', 'b\na\n10\n2', '10\n2\na\nb'],
      ['descending', 'b\na\n10\n2', 'b\na\n2\n10'],
      ['replace', 'aaaa', 'bb'],
    ]) {
      await operation.selectOption(mode!)
      await input.fill(source!)
      if (mode === 'replace') {
        await page.getByLabel('查找文本', { exact: true }).fill('aa')
        await page.getByLabel('替换为（可为空）', { exact: true }).fill('b')
      }
      await page.getByRole('button', { name: '处理文本', exact: true }).click()
      await expect(result).toHaveValue(expected!)
      await expect(input).toHaveValue(source!)
    }
    await page.getByLabel('替换为（可为空）', { exact: true }).fill('')
    await expect(result).toHaveValue('')
    await page.getByRole('button', { name: '处理文本', exact: true }).click()
    await expect(page.locator('#cleanup-status')).toHaveText('结果为空。')
    await expect(page.getByRole('button', { name: '复制结果', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: '填入示例', exact: true }).click()
    await expect(input).toHaveValue('aaaa')
    await expect(page.locator('#cleanup-status')).toContainText('请先清空')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await info.attach(`text-cleanup-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    await page.getByRole('button', { name: '清空', exact: true }).click()
    await expect(input).toBeFocused(); await expect(input).toHaveValue('')
    await expect(operation).toHaveValue('trim')
    await page.reload(); await hydrated(page)
    await expect(input).toHaveValue('')
  })
}

test('CLEAN 键盘、超限与复制失败、离页清理及搜索入口', async ({ page, browserName }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(Error('denied')) } }))
  await page.goto('/'); await hydrated(page)
  await page.getByLabel('搜索工具', { exact: true }).fill('文本整理')
  await expect(page.locator('.tool-grid li')).toHaveCount(1)
  await page.getByRole('link', { name: '试用工具 ：文本整理', exact: true }).click(); await hydrated(page)
  const input = page.getByLabel('待整理文本', { exact: true }), result = page.getByLabel('整理结果（只读）', { exact: true })
  await input.focus(); await page.keyboard.type('  hello  ')
  await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab')
  await expect(page.getByRole('button', { name: '处理文本', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(result).toHaveValue('hello')
  await page.getByRole('button', { name: '复制结果', exact: true }).click()
  await expect(page.locator('#cleanup-status')).toContainText('手动复制')
  await expect(result).toBeFocused()
  await input.fill('x'.repeat(100001))
  await page.getByRole('button', { name: '处理文本', exact: true }).click()
  await expect(page.locator('#cleanup-status')).toContainText('输入超过')
  expect((await input.inputValue()).length).toBe(100001)
  await expect(result).toHaveValue('')
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await expect(input).toHaveValue('')
  await expect(page.locator('#cleanup-status')).toHaveText('')
  await page.getByRole('link', { name: '办公工具', exact: true }).first().click(); await hydrated(page)
  await page.getByRole('link', { name: '试用工具 ：文本整理', exact: true }).click(); await hydrated(page)
  await expect(input).toHaveValue('')
})
