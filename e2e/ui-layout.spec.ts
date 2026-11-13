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
        await expect(page.getByRole('textbox')).toHaveCount(1)
        for (const name of ['打开工具 ：文本统计', '打开工具 ：JSON 格式化与校验', '打开工具 ：URL 编解码', '打开工具 ：2FA 动态验证码']) {
          await expect(page.getByRole('link', { name, exact: true })).toHaveCount(1)
        }
        const cards = await page.locator('.tool-card').all()
        expect(cards).toHaveLength(20)
        const boxes = await Promise.all(cards.map(card => card.boundingBox()))
        const office = await page.locator('.office .tool-card').first().boundingBox()
        const developer = await page.locator('.developer .tool-card').first().boundingBox()
        expect(developer!.y).toBeGreaterThan(office!.y)
        if (width < 640) expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y)
      }
      // UI2 replaces the historical office single-column / home 1:2 split.
      for (const grid of await page.locator('.tool-grid, .category-grid').all()) {
        const columns = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)
        expect(columns).toBe(width < 640 ? 1 : width < 1024 ? 2 : width < 1280 ? 3 : 4)
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

// B3-1只新增可观察的路径/间距及内容保护，不改已有B1/B2断言。
for (const [width, height] of [[320, 812], [375, 812], [390, 844], [430, 932], [1440, 900], [1920, 1080]]) {
  test(`UI-B3-1 操作路径与内容保护 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width: width!, height: height! })
    const geometry = []
    for (const [name, path, prefix] of [
      ['text', '/office/text-statistics/', 'statistics'],
      ['json', '/developer/json-formatter/', 'json'],
      ['url', '/developer/url-encoder/', 'url'],
    ] as const) {
      await page.goto(path)
      await hydrated(page)
      const input = page.locator(`#${prefix}-input`)
      const actions = page.locator('.editor-pane > .actions')
      const result = page.locator(name === 'text' ? 'dl.statistics' : `#${prefix}-output`)
      const initial = await Promise.all([input.boundingBox(), actions.boundingBox(), result.boundingBox()])
      geometry.push({ name, width, height, state: 'empty', scrollY: await page.evaluate(() => scrollY), input: initial[0], actions: initial[1], result: initial[2] })
      expect(initial[1]!.y).toBeGreaterThanOrEqual(initial[0]!.y + initial[0]!.height)
      if (width! < 640) {
        expect(initial[2]!.y).toBeGreaterThan(initial[1]!.y)
        expect(initial[0]!.height).toBeGreaterThanOrEqual(192)
        expect(initial[0]!.height).toBeLessThanOrEqual(288)
        expect(await actions.evaluate(node => parseFloat(getComputedStyle(node).gap))).toBeGreaterThanOrEqual(8)
      } else {
        expect(initial[0]!.height).toBe(384)
        expect(initial[2]!.x).toBeGreaterThan(initial[0]!.x + initial[0]!.width)
      }
      const controls = []
      for (const control of await page.locator('.workspace button, .workspace select').all()) {
        const box = await control.boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(44)
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width!)
        controls.push({ text: await control.textContent(), box })
      }
      geometry.push({ name, state: 'controls', controls })
      await page.screenshot({ path: info.outputPath(`b3-1-${name}-${width}x${height}-empty-viewport.png`) })
      await page.screenshot({ path: info.outputPath(`b3-1-${name}-${width}x${height}-empty-full.png`), fullPage: true })
      const value = name === 'json' ? JSON.stringify({ text: 'B3-1 合成数据😀'.repeat(200) }) : 'B3-1 合成数据😀 / ? &='.repeat(200)
      await input.fill(value)
      if (name !== 'text') await page.getByRole('button', { name: name === 'json' ? '格式化' : '编码', exact: true }).click()
      const output = name === 'text' ? page.locator('dd') : result
      const expected = name === 'text' ? await output.allTextContents() : await output.inputValue()
      await input.click()
      for (const nextWidth of [320, 768, 1024, 1440, width!]) {
        await page.setViewportSize({ width: nextWidth, height: height! })
        await expect(input).toHaveValue(value)
        await expect(input).toBeFocused()
        if (name === 'text') await expect(output).toHaveText(expected as string[])
        else await expect(output).toHaveValue(expected as string)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      }
      if (width === 375 || width === 1440) {
        await page.screenshot({ path: info.outputPath(`b3-1-${name}-${width}-long-focus-full.png`), fullPage: true })
        if (name !== 'text') {
          const bad = name === 'json' ? '{' : '%'
          await input.fill(bad)
          await page.getByRole('button', { name: name === 'json' ? '格式化' : '解码', exact: true }).click()
          await expect(input).toHaveValue(bad)
          await expect(input).toHaveAttribute('aria-invalid', 'true')
          await expect(result).toHaveValue('')
          await expect(page.locator(`#${prefix}-status`)).not.toHaveText('')
          await page.screenshot({ path: info.outputPath(`b3-1-${name}-${width}-error-full.png`), fullPage: true })
        }
      }
    }
    await info.attach('b3-1-geometry', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' })
  })
}

// B3-2A：只新增统计卡密度和内容几何验收，保留既有测试原文。
for (const [width, height] of [[320, 812], [375, 812], [390, 844], [430, 932], [1440, 900], [1920, 1080]] as const) {
  test(`UI-B3-2A 统计卡可读性 ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height })
    await page.goto('/office/text-statistics/')
    await hydrated(page)
    const input = page.locator('#statistics-input')
    const cards = page.locator('dl.statistics > div')
    const labels = ['字符总数', '去空白字符数', '词段数（按空白分隔）', '总行数', '非空行数']
    await expect(cards).toHaveCount(5)
    await expect(page.locator('dl.statistics dt')).toHaveText(labels)
    const evidence = []
    for (const [state, value, expected] of [
      ['empty', '', ['0', '0', '0', '0', '0']],
      ['unicode-lines', '甲 😀\n乙', ['5', '3', '3', '2', '2']],
      ['large', '字'.repeat(100_000), ['100,000', '100,000', '1', '1', '1']],
    ] as const) {
      await input.fill(value)
      await expect(input).toHaveValue(value)
      await expect(page.locator('dl.statistics dd')).toHaveText([...expected])
      const geometry = await cards.evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        const texts = [...node.querySelectorAll('dt, dd')].map(element => {
          const range = document.createRange()
          range.selectNodeContents(element)
          const style = getComputedStyle(element)
          return {
            text: element.textContent, fontSize: parseFloat(style.fontSize),
            textOverflow: style.textOverflow, whiteSpace: style.whiteSpace,
            x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y,
            width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
            scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
            fragments: [...range.getClientRects()].map(r => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom })),
          }
        })
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, texts }
      }))
      const group = (await page.locator('dl.statistics').boundingBox())!
      expect(Math.abs(geometry[0]!.width - group.width)).toBeLessThan(1)
      if (width === 320 || width >= 1440) {
        for (let i = 1; i < 5; i++) {
          expect(Math.abs(geometry[i]!.x - geometry[0]!.x)).toBeLessThan(1)
          expect(geometry[i]!.y).toBeGreaterThanOrEqual(geometry[i - 1]!.y + geometry[i - 1]!.height)
        }
      } else {
        expect(Math.abs(geometry[1]!.y - geometry[2]!.y)).toBeLessThan(1)
        expect(Math.abs(geometry[3]!.y - geometry[4]!.y)).toBeLessThan(1)
        expect(geometry[2]!.x).toBeGreaterThan(geometry[1]!.x + geometry[1]!.width)
        expect(geometry[3]!.y).toBeGreaterThanOrEqual(geometry[1]!.y + geometry[1]!.height)
      }
      for (const card of geometry) {
        for (const text of card.texts) {
          expect(text.fontSize).toBeGreaterThanOrEqual(14)
          expect(text.textOverflow).not.toBe('ellipsis')
          expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth + 1)
          for (const fragment of text.fragments) {
            expect(fragment.x).toBeGreaterThanOrEqual(card.x)
            expect(fragment.right).toBeLessThanOrEqual(card.x + card.width)
            expect(fragment.y).toBeGreaterThanOrEqual(card.y)
            expect(fragment.bottom).toBeLessThanOrEqual(card.y + card.height)
          }
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      if (width >= 1440) {
        const editor = (await page.locator('.editor-pane').boundingBox())!
        expect(group.x).toBeGreaterThan(editor.x + editor.width)
        expect((await input.boundingBox())!.height).toBe(384)
        expect((await page.locator('main').boundingBox())!.width).toBeLessThanOrEqual(1440)
      }
      evidence.push({ state, width, height, group, cards: geometry, expectedColumns: width === 320 || width >= 1440 ? 1 : 2 })
      await page.screenshot({ path: info.outputPath(`b3-2a-text-${width}x${height}-${state}-full.png`), fullPage: true })
      await page.locator('dl.statistics').screenshot({ path: info.outputPath(`b3-2a-statistics-${width}-${state}.png`) })
    }
    await info.attach('b3-2a-statistics-geometry', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
  })
}

// B3-2B：新增手机Flex、错误层级及可见性测量；既有测试完整保留。
for (const [width, height] of [[320, 812], [375, 812], [390, 844], [430, 932], [1440, 900], [1920, 1080]] as const) {
  test(`UI-B3-2B 手机动作与错误状态 ${width}`, async ({ page, browserName }, info) => {
    await page.setViewportSize({ width, height })
    const evidence = []
    for (const [name, path] of [['json', '/developer/json-formatter/'], ['url', '/developer/url-encoder/']] as const) {
      await page.goto(path)
      await hydrated(page)
      const input = page.locator(`#${name}-input`)
      const actions = page.locator('.editor-pane > .actions')
      const status = page.locator(`#${name}-status`)
      const snapshot = async () => page.locator('.editor-pane').evaluate(pane => {
        const textarea = pane.querySelector('textarea')!
        const actions = pane.querySelector('.actions')!
        const status = pane.querySelector('.status')!
        const rect = (element: Element) => element.getBoundingClientRect().toJSON() as { x: number; y: number; width: number; height: number; right: number; bottom: number }
        const controls = [...actions.children].map(element => {
          const box = rect(element), style = getComputedStyle(element)
          const range = document.createRange()
          if (!(element instanceof HTMLSelectElement)) range.selectNodeContents(element)
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')!
          context.font = style.font
          return {
            tag: element.tagName, text: element instanceof HTMLSelectElement ? element.selectedOptions[0]!.text : element.textContent,
            box, fontSize: parseFloat(style.fontSize), paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight),
            borderLeft: parseFloat(style.borderLeftWidth), borderRight: parseFloat(style.borderRightWidth),
            selectedTextWidth: element instanceof HTMLSelectElement ? context.measureText(element.selectedOptions[0]!.text).width : null,
            fragments: element instanceof HTMLSelectElement ? [] : [...range.getClientRects()].map(r => ({ x: r.x, right: r.right, y: r.y, bottom: r.bottom })),
          }
        })
        const statusStyle = getComputedStyle(status), statusBox = rect(status)
        const visibleHeight = Math.max(0, Math.min(statusBox.bottom, innerHeight) - Math.max(statusBox.y, 0))
        return {
          scrollY, viewportHeight: innerHeight, viewportWidth: innerWidth,
          input: rect(textarea), actions: rect(actions), status: statusBox,
          statusDocumentY: statusBox.y + scrollY, actionsDocumentY: rect(actions).y + scrollY,
          statusVisibleHeight: visibleHeight, statusVisibleRatio: statusBox.height ? visibleHeight / statusBox.height : 0,
          statusText: status.textContent, statusStyle: { border: parseFloat(statusStyle.borderInlineStartWidth), weight: parseInt(statusStyle.fontWeight), background: statusStyle.backgroundColor, marginTop: parseFloat(statusStyle.marginTop), paddingTop: parseFloat(statusStyle.paddingTop), paddingLeft: parseFloat(statusStyle.paddingLeft) },
          scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, controls,
        }
      })
      const initial = await snapshot()
      expect(initial.scrollWidth).toBeLessThanOrEqual(initial.clientWidth)
      const rows: { center: number; controls: typeof initial.controls }[] = []
      for (const control of initial.controls) {
        const center = control.box.y + control.box.height / 2
        let row = rows.find(candidate => Math.abs(candidate.center - center) < 2)
        if (!row) { row = { center, controls: [] }; rows.push(row) }
        row.controls.push(control)
        expect(control.box.x).toBeGreaterThanOrEqual(initial.actions.x)
        expect(control.box.right).toBeLessThanOrEqual(initial.actions.right + 0.1)
        if (control.tag !== 'LABEL') {
          expect(control.box.height).toBeGreaterThanOrEqual(44)
          expect(control.box.width).toBeGreaterThanOrEqual(44)
          expect(control.fontSize).toBe(16)
        }
        for (const fragment of control.fragments) {
          expect(fragment.x).toBeGreaterThanOrEqual(control.box.x)
          expect(fragment.right).toBeLessThanOrEqual(control.box.right)
          expect(fragment.y).toBeGreaterThanOrEqual(control.box.y)
          expect(fragment.bottom).toBeLessThanOrEqual(control.box.bottom)
        }
        if (control.selectedTextWidth !== null) {
          expect(control.selectedTextWidth + control.paddingLeft + control.paddingRight + control.borderLeft + control.borderRight).toBeLessThanOrEqual(control.box.width + 1)
        }
      }
      for (const row of rows) {
        for (let i = 1; i < row.controls.length; i++) {
          expect(row.controls[i]!.box.x - row.controls[i - 1]!.box.right).toBeGreaterThanOrEqual(width < 640 ? 7.9 : 11.9)
        }
      }
      if (width < 640) {
        expect(rows).toHaveLength(name === 'json' && width === 320 ? 3 : 2)
        if (name === 'json' && width === 320) {
          expect(rows.at(-1)!.controls.map(control => control.text)).toEqual(['清空'])
          expect(Math.abs(rows.at(-1)!.controls[0]!.box.width - initial.actions.width)).toBeLessThan(1)
        } else {
          expect(rows.at(-1)!.controls.length).toBeGreaterThan(1)
        }
        for (const button of initial.controls.filter(control => control.tag === 'BUTTON')) expect(button.paddingLeft).toBe(8)
      } else {
        for (const button of initial.controls.filter(control => control.tag === 'BUTTON')) expect(button.paddingLeft).toBe(16)
        expect(initial.input.height).toBe(384)
        const output = (await page.locator(`#${name}-output`).boundingBox())!
        expect(output.x).toBeGreaterThan(initial.input.x + initial.input.width)
      }
      await page.screenshot({ path: info.outputPath(`b3-2b-${name}-${width}x${height}-empty-viewport.png`) })
      await page.screenshot({ path: info.outputPath(`b3-2b-${name}-${width}x${height}-empty-full.png`), fullPage: true })
      await input.fill(name === 'json' ? '{"text":"B3-2B"}' : 'B3-2B space')
      await page.getByRole('button', { name: name === 'json' ? '格式化' : '编码', exact: true }).click()
      await expect(page.locator(`#${name}-output`)).not.toHaveValue('')
      const success = await snapshot()
      expect(success.statusStyle.border).toBe(0)
      const tabKey = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
      await input.click()
      await page.keyboard.press(tabKey)
      await expect(page.locator(`#${name === 'json' ? 'json-indent' : 'url-mode'}`)).toBeFocused()
      await page.keyboard.press(tabKey)
      await expect(page.getByRole('button', { name: name === 'json' ? '校验语法' : '编码', exact: true })).toBeFocused()
      await page.screenshot({ path: info.outputPath(`b3-2b-${name}-${width}-action-focus.png`) })
      const bad = name === 'json' ? '{' : '%'
      await input.fill(bad)
      const beforeAction = await snapshot()
      await page.getByRole('button', { name: name === 'json' ? '格式化' : '解码', exact: true }).click()
      await expect(input).toHaveValue(bad)
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      await expect(page.locator(`#${name}-output`)).toHaveValue('')
      await expect(status).toHaveText(name === 'json' ? 'JSON 语法错误，请检查引号、逗号或括号。' : '无法解码：百分号转义或 UTF-8 编码无效；原文已保留。')
      await expect(status).toHaveAttribute('role', 'status')
      await expect(status).toHaveAttribute('aria-live', 'polite')
      await expect(status).toHaveAttribute('aria-atomic', 'true')
      const error = await snapshot()
      expect(Math.abs(error.actions.height - beforeAction.actions.height)).toBeLessThan(1)
      expect(error.scrollWidth).toBeLessThanOrEqual(error.clientWidth)
      expect(error.status.x).toBeGreaterThanOrEqual(error.actions.x)
      expect(error.status.right).toBeLessThanOrEqual(error.actions.right + 0.1)
      if (width < 640) {
        expect(error.statusStyle.border).toBe(3)
        expect(error.statusStyle.weight).toBeGreaterThanOrEqual(650)
        expect(error.statusStyle.background).not.toBe('rgba(0, 0, 0, 0)')
        expect(error.statusStyle.marginTop).toBe(8)
        expect(error.statusStyle.paddingTop).toBe(8)
      } else expect(error.statusStyle.border).toBe(0)
      // 可见比例只记录；不把CSS强化伪装为自动定位或保证当前视口可见。
      await page.screenshot({ path: info.outputPath(`b3-2b-${name}-${width}-error-after-action-viewport.png`) })
      await page.screenshot({ path: info.outputPath(`b3-2b-${name}-${width}-error-full.png`), fullPage: true })
      evidence.push({ name, width, height, initial, rows, success, beforeAction, error })
    }
    await info.attach('b3-2b-actions-status-geometry', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' })
  })
}

// F44: append-only protection; original B1/B2/B3 assertions remain unchanged.
const f44Widths = [320, 375, 390, 430, 639, 640, 768, 820, 959, 960, 1024, 1199, 1200, 1440, 1920]
const f44Screens = [320, 639, 640, 1199, 1200, 1440, 1920]
for (const width of f44Widths) {
  test(`F44-BRAND ${width}`, async ({ page, browserName }, info) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : width < 640 ? 812 : 900 })
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
    const observations = []
    for (const zone of ['icon', 'text', 'top', 'bottom']) {
      await page.goto('/office/text-statistics/')
      await hydrated(page)
      const brand = page.locator('a.brand')
      const box = (await brand.boundingBox())!
      const mark = (await brand.locator('.brand-mark').boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(mark.width).toBe(36)
      expect(mark.height).toBe(36)
      await expect(brand).toHaveAttribute('href', '/')
      await expect(brand).toHaveAttribute('aria-label', '顺手集 ToolHug，返回首页')
      await expect(brand.locator('span').nth(1)).toHaveText('顺手集ToolHug')
      for (const link of await page.locator('.site-header nav a').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      observations.push({ zone, box, mark, header: await page.locator('.site-header').boundingBox(), main: await page.locator('main').boundingBox() })
      if (zone === 'icon') await brand.locator('.brand-mark').click()
      else if (zone === 'text') await brand.locator('span').nth(1).click()
      else await brand.click({ position: { x: box.width / 2, y: zone === 'top' ? 1 : box.height - 1 } })
      await expect(page).toHaveURL(url => url.pathname === '/')
      expect(new URL(page.url()).pathname).toBe('/')
      await expect(page.locator('h1')).toHaveText('让日常工作，轻松一点。')
    }
    await page.goto('/office/text-statistics/')
    await hydrated(page)
    await page.keyboard.press(tab)
    const skip = page.getByRole('link', { name: '跳转到主内容', exact: true })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
    await page.goto('/office/text-statistics/')
    await hydrated(page)
    await page.keyboard.press(tab)
    await expect(skip).toBeFocused()
    await page.keyboard.press(tab)
    await expect(page.locator('.brand')).toBeFocused()
    expect(await page.locator('.brand').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
    if (f44Screens.includes(width)) await page.screenshot({ path: info.outputPath(`F44-brand-${width}.png`) })
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(url => url.pathname === '/')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await info.attach('F44-brand-geometry', { body: JSON.stringify({ width, observations }), contentType: 'application/json' })
  })

  test(`F44-SUMMARY ${width}`, async ({ page, browserName }, info) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : width < 640 ? 812 : 900 })
    await page.goto('/office/text-statistics/')
    await hydrated(page)
    const summary = page.locator('details > summary')
    const details = page.locator('details')
    await expect(summary).toHaveText('查看空白与字符计数细则')
    expect(await summary.evaluate(el => el.tagName)).toBe('SUMMARY')
    expect(await summary.evaluate(el => getComputedStyle(el).display)).toBe('list-item')
    expect(await summary.evaluate(el => getComputedStyle(el).fontSize)).toBe('14px')
    expect(await summary.evaluate(el => getComputedStyle(el).listStyleType)).not.toBe('none')
    const labels = await page.locator('.statistics dt').allTextContents()
    expect(labels).toEqual(['字符总数', '去空白字符数', '词段数（按空白分隔）', '总行数', '非空行数'])
    const values = await page.locator('.statistics dd').allTextContents()
    const geometry = async () => page.evaluate(() => {
      const rect = (s: string) => { const el = document.querySelector(s)!; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, documentY: b.y + scrollY, width: b.width, height: b.height } }
      return { scrollY, summary: rect('summary'), details: rect('details'), rules: rect('.rules'), footer: rect('footer'), input: rect('textarea'), statistics: rect('.statistics'), open: document.querySelector('details')!.open, marker: getComputedStyle(document.querySelector('summary')!, '::marker').content }
    })
    const closed = await geometry()
    expect(closed.summary.height).toBeGreaterThanOrEqual(44)
    await expect(details).not.toHaveAttribute('open', '')
    // Range measures text only; activation still uses a real pointer click.
    const textPoint = await summary.evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el)
      const t = range.getBoundingClientRect(), b = el.getBoundingClientRect()
      return { x: t.x - b.x + Math.min(8, t.width / 2), y: t.y - b.y + t.height / 2 }
    })
    await summary.click({ position: textPoint })
    await expect(details).toHaveAttribute('open', '')
    await expect(details.locator('p').first()).toBeVisible()
    const opened = await geometry()
    if (f44Screens.includes(width)) await page.screenshot({ path: info.outputPath(`F44-summary-open-${width}.png`), fullPage: true })
    const box = (await summary.boundingBox())!
    await summary.click({ position: { x: box.width / 2, y: box.height - 2 } })
    await expect(details).not.toHaveAttribute('open', '')
    await expect(details.locator('p').first()).not.toBeVisible()
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
    await page.locator('textarea').click()
    let reached = false
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press(tab)
      if (await summary.evaluate(el => el === document.activeElement)) { reached = true; break }
    }
    expect(reached, '真实Tab序列必须到达原生summary').toBe(true)
    await expect(summary).toBeFocused()
    expect(await summary.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('open', '')
    await page.keyboard.press('Space')
    await expect(details).not.toHaveAttribute('open', '')
    await expect(page.locator('.statistics dd')).toHaveText(values)
    expect(await page.locator('.statistics dt').allTextContents()).toEqual(labels)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    if (f44Screens.includes(width)) await page.screenshot({ path: info.outputPath(`F44-summary-focus-${width}.png`), fullPage: true })
    await info.attach('F44-summary-geometry', { body: JSON.stringify({ width, closed, opened, final: await geometry() }), contentType: 'application/json' })
  })
}
