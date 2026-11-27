import { tools } from '../src/data/tools'
import { expect, hydrated, pages, test } from './helpers'

const toolRoutes = pages.filter(page => tools.some(tool => tool.status === 'preview' && tool.routeName === page.routeName))

for (const width of [375, 768, 1440]) {
  test(`全部工具页的操作区和指南可用 · ${width}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: 900 })
    expect(toolRoutes).toHaveLength(27)

    for (const definition of toolRoutes) {
      await test.step(definition.path, async () => {
        await page.goto(definition.path)
        await hydrated(page)
        const operation = page.getByRole('group', { name: '工具操作', exact: true })
        const guide = page.getByRole('region', { name: '使用指南', exact: true })
        await expect(operation).toBeEnabled()
        await expect(guide.getByRole('heading', { level: 3 })).toHaveCount(4)
        await expect(guide.getByRole('heading', { level: 4 })).toHaveCount(2)
        const grid = guide.locator('.guide-grid')
        expect(await grid.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(width === 1440 ? 2 : 1)
        await expect(guide.locator('dl dt')).toHaveText(['输入或选择', '结果'])
        await expect(guide.locator('dl dd')).toHaveCount(2)
        const input = await operation.locator('textarea:visible').first()
        if (await input.count()) {
          expect(await input.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
        const guideLink = page.getByRole('link', { name: '查看使用指南', exact: true })
        const topLine = page.locator('.tool-topline')
        await expect(topLine.getByRole('link', { name: '查看使用指南', exact: true })).toBeVisible()
        const guideLinkBox = (await guideLink.boundingBox())!
        const titleBox = (await page.getByRole('heading', { level: 1 }).boundingBox())!
        expect(guideLinkBox.height).toBeGreaterThanOrEqual(44)
        expect(guideLinkBox.y + guideLinkBox.height).toBeLessThanOrEqual(titleBox.y)
        await guideLink.press('Enter')
        await expect(page).toHaveURL(/#tool-guide$/)
        await expect(guide).toBeFocused()
        await guide.getByRole('link', { name: '返回工具操作', exact: true }).press('Enter')
        await expect(page).toHaveURL(/#tool-operation$/)
        await expect(operation).toBeFocused()
      })
    }
  })
}

test('打印样式隐藏操作区说明并取消边框', async ({ page }) => {
  await page.goto('/office/word-to-pdf/')
  await hydrated(page)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('#tool-guide')).toBeHidden()
  await expect(page.locator('#tool-operation')).toHaveCSS('border-top-width', '0px')
})

test('短视口可见指南首节，历史导航恢复指南位置', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 320, height: 256 })
  await page.goto('/')
  await hydrated(page)
  await expect(page.locator('.site-header')).toHaveCSS('position', 'static')
  await page.getByRole('link', { name: '跳转到主内容', exact: true }).press('Enter')
  await expect(page.locator('main')).toBeFocused()
  const shortcuts = page.getByRole('navigation', { name: '工具分类快捷入口' })
  await shortcuts.getByRole('link', { name: /开发者工具/ }).press('Enter')
  await expect(page.locator('#developer-tools')).toBeFocused()
  await expect(page.locator('#developer-tools-title')).toBeInViewport({ ratio: 1 })

  for (const definition of toolRoutes) {
    await test.step(definition.path, async () => {
      await page.goto(definition.path)
      await hydrated(page)
      const guide = page.getByRole('region', { name: '使用指南', exact: true })
      const firstSection = guide.getByRole('heading', { name: '使用步骤', exact: true })
      await page.getByRole('link', { name: '查看使用指南', exact: true }).press('Enter')
      await expect(guide).toBeFocused()
      await expect(firstSection).toBeInViewport({ ratio: 1 })
      await guide.getByRole('link', { name: '返回工具操作', exact: true }).press('Enter')
      await expect(page.getByRole('group', { name: '工具操作', exact: true })).toBeFocused()
      await page.goBack()
      await expect(page).toHaveURL(/#tool-guide$/)
      await expect(guide).toBeFocused()
      await expect(firstSection).toBeInViewport({ ratio: 1 })
    })
  }
})

test('全站链接和工具主按钮无装饰下划线，保留键盘焦点', async ({ page }) => {
  test.setTimeout(120_000)
  for (const path of [...pages.map(definition => definition.path), '/missing/']) {
    await page.goto(path)
    await hydrated(page)
    const underlined = await page.locator('a[href], button').evaluateAll(elements =>
      elements.filter(element => getComputedStyle(element).textDecorationLine.includes('underline'))
        .map(element => element.textContent),
    )
    expect(underlined, path).toEqual([])
  }

  for (const [path, buttonName] of [
    ['/office/text-statistics/', '复制文本'],
    ['/developer/json-formatter/', '格式化'],
    ['/developer/url-encoder/', '编码'],
  ] as const) {
    await page.goto(path)
    await hydrated(page)
    if (buttonName === '复制文本') await page.getByRole('button', { name: '填入示例' }).click()
    const button = page.getByRole('button', { name: buttonName, exact: true })
    await button.hover()
    await expect(button).toHaveCSS('text-decoration-line', 'none')
  }

  const link = page.getByRole('link', { name: '查看使用指南', exact: true })
  await link.hover()
  await expect(link).toHaveCSS('text-decoration-line', 'none')
  await page.keyboard.press('Tab')
  await link.focus()
  await expect(link).toHaveCSS('outline-style', 'solid')
  await expect(link).toHaveCSS('text-decoration-line', 'none')
})
