import { test, expect, hydrated } from './helpers'

for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`UI-B1 首页与目录布局 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/', '/office/', '/developer/']) {
      await page.goto(path)
      await expect(page.locator('main')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      const main = await page.locator('main').boundingBox()
      expect(main!.width).toBeLessThanOrEqual(1280)
      for (const link of await page.locator('.site-header nav a, .tool-card a').all()) {
        await expect(link).toBeVisible()
        const bounds = await link.boundingBox()
        expect(bounds!.height).toBeGreaterThanOrEqual(44)
        expect(bounds!.x).toBeGreaterThanOrEqual(0)
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      }
      if (path === '/') {
        await expect(page.getByRole('textbox')).toHaveCount(0)
        for (const name of ['打开文本统计', '打开JSON 格式化与校验', '打开URL 编解码']) {
          await expect(page.getByRole('link', { name, exact: true })).toHaveCount(1)
        }
        const cards = await page.locator('.tool-card').all()
        expect(cards).toHaveLength(3)
        const boxes = await Promise.all(cards.map(card => card.boundingBox()))
        if (width >= 1200) {
          expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2)
          expect(Math.abs(boxes[1]!.y - boxes[2]!.y)).toBeLessThan(2)
          expect(Math.abs(boxes[0]!.width - boxes[2]!.width)).toBeLessThan(2)
        } else if (width < 640) {
          expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y)
        }
      } else if (path === '/office/') {
        const card = await page.locator('.tool-card').boundingBox()
        expect(card!.width).toBeLessThanOrEqual(420)
      }
    }
  })
}

test('UI-B1 跳转焦点及视口重排保持工具输入', async ({ page, browserName }) => {
  const tabKey = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
  await page.goto('/')
  await hydrated(page)
  const skip = page.getByRole('link', { name: '跳转到主内容', exact: true })
  await expect(skip).toHaveCount(1)
  await page.keyboard.press(tabKey)
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  expect(await skip.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.goto('/office/text-statistics/')
  const input = page.getByRole('textbox', { name: '输入或粘贴文本', exact: true })
  await expect(input).toBeEnabled()
  await input.fill('B1 synthetic input')
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(input).toHaveValue('B1 synthetic input')
    await expect(page.getByRole('textbox')).toHaveCount(1)
  }
})

for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`UI-B2 三工具工作台几何与截图 ${width}`, async ({ page }, info) => {
    const height = width === 1920 ? 1080 : width === 390 ? 844 : width === 430 ? 932 : width < 640 ? 812 : 900
    await page.setViewportSize({ width, height })
    for (const [name, path, prefix] of [
      ['text', '/office/text-statistics/', 'statistics'],
      ['json', '/developer/json-formatter/', 'json'],
      ['url', '/developer/url-encoder/', 'url'],
    ] as const) {
      await page.goto(path)
      await hydrated(page)
      const input = page.locator(`#${prefix}-input`)
      await expect(input).toBeEnabled()
      const main = await page.locator('main').boundingBox()
      expect(main!.width).toBeLessThanOrEqual(1440)
      expect(main!.width).toBeGreaterThan(width >= 1920 ? 1400 : width - 80)
      const inputBox = await input.boundingBox()
      const result = page.locator(name === 'text' ? 'dl.statistics' : `#${prefix}-output`)
      const resultBox = await result.boundingBox()
      if (width >= 1200) {
        expect(resultBox!.x).toBeGreaterThan(inputBox!.x + inputBox!.width)
        const reference = name === 'text' ? await page.locator('.editor-pane').boundingBox() : inputBox
        expect(Math.abs(resultBox!.y - reference!.y)).toBeLessThan(4)
        expect(inputBox!.height).toBeGreaterThanOrEqual(380)
      } else {
        expect(resultBox!.y).toBeGreaterThan(inputBox!.y + inputBox!.height)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      for (const control of await page.locator('main button, main select').all()) {
        await expect(control).toBeVisible()
        const box = await control.boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(44)
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      }
      await page.screenshot({ path: info.outputPath(`${name}-${width}x${height}-empty-full.png`), fullPage: true })
      if (width >= 1280) await page.screenshot({ path: info.outputPath(`${name}-${width}x${height}-empty-viewport.png`) })
    }
  })
}

for (const [name, path, prefix] of [
  ['text', '/office/text-statistics/', 'statistics'],
  ['json', '/developer/json-formatter/', 'json'],
  ['url', '/developer/url-encoder/', 'url'],
] as const) {
  test(`UI-B2 长内容错误与重排完整性 ${name}`, async ({ page }, info) => {
    await page.goto(path)
    await hydrated(page)
    const input = page.locator(`#${prefix}-input`)
    const originalNode = await input.elementHandle()
    const value = name === 'json' ? JSON.stringify({ text: '合成数据😀'.repeat(300) }) : '合成数据😀 / ? &='.repeat(300)
    await input.fill(value)
    if (name !== 'text') await page.getByRole('button', { name: name === 'json' ? '格式化' : '编码', exact: true }).click()
    const result = name === 'text' ? page.locator('dd') : page.locator(`#${prefix}-output`)
    const expected = name === 'text' ? await result.allTextContents() : await result.inputValue()
    if (name === 'text') expect(expected).toHaveLength(5)
    else expect(expected).not.toBe('')
    for (const width of [1440, 320, 375, 390, 430, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(input).toHaveValue(value)
      expect(await originalNode!.evaluate(node => node === document.querySelector('main textarea'))).toBe(true)
      if (name === 'text') await expect(result).toHaveText(expected as string[])
      else await expect(result).toHaveValue(expected as string)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      if (width === 1440 || width === 375) await page.screenshot({ path: info.outputPath(`${name}-${width}-long-full.png`), fullPage: true })
    }
    if (name !== 'text') {
      const badValue = name === 'json' ? '{' : '%'
      await input.fill(badValue)
      await page.getByRole('button', { name: name === 'json' ? '格式化' : '解码', exact: true }).click()
      await expect(input).toHaveValue(badValue)
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      await expect(result).toHaveValue('')
      await expect(page.locator(`#${prefix}-status`)).not.toHaveText('')
      for (const width of [1440, 375]) {
        await page.setViewportSize({ width, height: 900 })
        await page.screenshot({ path: info.outputPath(`${name}-${width}-error-full.png`), fullPage: true })
      }
    }
  })
}

test('UI-B2 键盘焦点截图', async ({ page, browserName }, info) => {
  const tabKey = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await hydrated(page)
    await page.keyboard.press(tabKey)
    await expect(page.getByRole('link', { name: '跳转到主内容' })).toBeFocused()
    await page.screenshot({ path: info.outputPath(`home-${width}-skip-focus.png`) })
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
    await page.screenshot({ path: info.outputPath(`home-${width}-main-focus.png`) })
    await page.goto('/developer/url-encoder/')
    await hydrated(page)
    const input = page.getByLabel('输入或粘贴文本', { exact: true })
    await input.click()
    await input.fill('B2 focus input')
    await page.keyboard.press(tabKey)
    await expect(page.getByLabel('处理模式', { exact: true })).toBeFocused()
    await page.keyboard.press(tabKey)
    await expect(page.getByRole('button', { name: '编码', exact: true })).toBeFocused()
    await page.screenshot({ path: info.outputPath(`url-${width}-encode-focus.png`) })
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('处理结果（只读）')).toHaveValue('B2%20focus%20input')
  }
})
