import { test, expect, hydrated, toolCases, origin } from './helpers'

test('E05 文本统计输入组合超限恢复与清空', async ({ page }) => {
  await page.goto('/office/text-statistics/')
  await hydrated(page)
  const editor = page.getByLabel('输入或粘贴文本', { exact: true })
  await editor.fill('你好 world\n😀')
  await expect(page.locator('dd')).toHaveText(['10', '8', '3', '2', '2'])
  await editor.dispatchEvent('compositionstart')
  // Firefox的fill本身会触发原生compositionend，合成“尚未结束”阶段使用InputEvent。
  await editor.evaluate((node: HTMLTextAreaElement) => {
    node.value = '你好'
    node.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText', data: '你好' }))
  })
  await expect(page.locator('dd')).toHaveText(['—', '—', '—', '—', '—'])
  await editor.dispatchEvent('compositionend')
  await expect(page.locator('dd')).toHaveText(['2', '2', '1', '1', '1'])
  await editor.fill('a'.repeat(100001))
  await expect(editor).toHaveValue('a'.repeat(100001))
  await expect(editor).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('dd')).toHaveText(['—', '—', '—', '—', '—'])
  await editor.fill('abc')
  await expect(page.locator('dd')).toHaveText(['3', '3', '1', '1', '1'])
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(editor).toHaveValue('')
  await expect(editor).toBeFocused()
  await expect(page.locator('dd')).toHaveText(['0', '0', '0', '0', '0'])
  await page.getByRole('button', { name: '填入示例' }).click()
  await expect(editor).toHaveValue('你好 world\nVue 3')
  await expect(page.getByRole('button', { name: '填入示例' })).toBeDisabled()
})

test('E05 JSON格式压缩语法与安全边界', async ({ page }) => {
  await page.goto('/developer/json-formatter/')
  await hydrated(page)
  const editor = page.getByLabel('输入或粘贴 JSON', { exact: true })
  const output = page.getByLabel('处理结果（只读）')
  const status = page.locator('#json-status')
  await editor.fill('{"a":"你好😀"}')
  await page.getByRole('button', { name: '格式化', exact: true }).click()
  await expect(output).toHaveValue('{\n  "a": "你好😀"\n}')
  await page.getByLabel('缩进', { exact: true }).selectOption('4')
  await expect(output).toHaveValue('')
  await page.getByRole('button', { name: '格式化', exact: true }).click()
  await expect(output).toHaveValue('{\n    "a": "你好😀"\n}')
  for (const value of ['{}', '[]', '"你好"', '42', 'false', 'null']) {
    await editor.fill(value)
    await page.getByRole('button', { name: '压缩', exact: true }).click()
    await expect(output).toHaveValue(value)
  }
  await editor.fill('{')
  await page.getByRole('button', { name: '格式化', exact: true }).click()
  await expect(status).toContainText('语法错误')
  await expect(editor).toHaveValue('{')
  await expect(output).toHaveValue('')
  await editor.fill('9007199254740993')
  await page.getByRole('button', { name: '压缩', exact: true }).click()
  await expect(status).toContainText('安全整数')
  await page.getByRole('button', { name: '校验语法' }).click()
  await expect(status).toContainText('语法合法')
  await editor.fill('a'.repeat(100001))
  await expect(page.getByRole('button', { name: '格式化', exact: true })).toBeDisabled()
  await expect(editor).toHaveValue('a'.repeat(100001))
  await editor.fill('{}')
  await page.getByRole('button', { name: '压缩', exact: true }).click()
  await expect(output).toHaveValue('{}')
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(editor).toHaveValue('')
  await expect(editor).toBeFocused()
  await expect(output).toHaveValue('')
  await expect(page.getByLabel('缩进', { exact: true })).toHaveValue('2')
})

test('E05 URL两模式四操作单轮与错误恢复', async ({ page }) => {
  await page.goto('/developer/url-encoder/')
  await hydrated(page)
  const editor = page.getByLabel('输入或粘贴文本', { exact: true })
  const output = page.getByLabel('处理结果（只读）')
  const mode = page.getByLabel('处理模式', { exact: true })
  await expect(mode).toHaveValue('component')
  for (const value of ['component', 'uri']) {
    await mode.selectOption(value)
    await editor.fill('你好 world😀/?')
    await page.getByRole('button', { name: '编码', exact: true }).click()
    const encoded = value === 'component' ? encodeURIComponent('你好 world😀/?') : encodeURI('你好 world😀/?')
    await expect(output).toHaveValue(encoded)
    await editor.fill(encoded)
    await page.getByRole('button', { name: '解码', exact: true }).click()
    await expect(output).toHaveValue('你好 world😀/?')
  }
  await mode.selectOption('component')
  await editor.fill('%252F')
  await page.getByRole('button', { name: '解码', exact: true }).click()
  await expect(output).toHaveValue('%2F')
  await page.getByRole('button', { name: '解码', exact: true }).click()
  await expect(output).toHaveValue('%2F')
  for (const invalid of ['%', '%GG', '%E4%BD', '%ED%A0%80']) {
    await editor.fill(invalid)
    await page.getByRole('button', { name: '解码', exact: true }).click()
    await expect(page.locator('#url-status')).toContainText('无法解码')
    await expect(editor).toHaveValue(invalid)
    await expect(output).toHaveValue('')
  }
  await editor.fill('a'.repeat(100001))
  await expect(page.getByRole('button', { name: '编码', exact: true })).toBeDisabled()
  await expect(editor).toHaveValue('a'.repeat(100001))
  await editor.fill('a b+c')
  await page.getByRole('button', { name: '编码', exact: true }).click()
  await expect(output).toHaveValue('a%20b%2Bc')
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(editor).toHaveValue('')
  await expect(editor).toBeFocused()
  await expect(output).toHaveValue('')
})

for (const tool of toolCases) {
  test('E05 复制成功失败挂起与卸载 ' + tool.id, async ({ page }) => {
    await page.addInitScript(() => {
      const state = { writes: [] as string[], mode: 'success', finish: undefined as undefined | (() => void) }
      Object.defineProperty(window, '__clip', { value: state })
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText(value: string) {
          state.writes.push(value)
          if (state.mode === 'reject') return Promise.reject(Error('synthetic denied'))
          if (state.mode === 'pending') return new Promise<void>(resolve => { state.finish = resolve })
          return Promise.resolve()
        },
        readText() { throw Error('禁止读取剪贴板') },
      } })
    })
    await page.goto(tool.path)
    await hydrated(page)
    const editor = page.getByLabel(tool.input, { exact: true })
    const status = page.locator('#' + tool.prefix + '-status')
    const state = () => page.evaluate(() => (window as unknown as { __clip: { writes: string[] } }).__clip.writes)
    const setMode = (mode: string) => page.evaluate(value => { (window as unknown as { __clip: { mode: string } }).__clip.mode = value }, mode)
    const finish = () => page.evaluate(() => { (window as unknown as { __clip: { finish: () => void } }).__clip.finish() })
    await editor.fill(tool.id === 'json' ? '{"a":1}' : 'local copy')
    if (tool.action) await page.getByRole('button', { name: tool.action, exact: true }).click()
    const expected = tool.id === 'json' ? '{"a":1}' : tool.id === 'url' ? 'local%20copy' : 'local copy'
    await page.getByRole('button', { name: tool.copy, exact: true }).click()
    await expect.poll(state).toEqual([expected])
    await expect(status).toContainText('已复制')
    await setMode('reject')
    await page.getByRole('button', { name: tool.copy, exact: true }).click()
    await expect(status).toContainText('手动复制')
    const target = tool.id === 'text' ? editor : page.getByLabel('处理结果（只读）')
    await expect(target).toBeFocused()
    expect(await target.evaluate((node: HTMLTextAreaElement) => [node.selectionStart, node.selectionEnd, node.value.length])).toEqual([0, expected.length, expected.length])
    await setMode('pending')
    await page.getByRole('button', { name: tool.copy, exact: true }).click()
    const pending = page.getByRole('button', { name: '复制中…', exact: true })
    await expect(pending).toBeDisabled()
    await pending.dispatchEvent('click')
    expect((await state()).length).toBe(3)
    await page.getByRole('button', { name: '清空', exact: true }).click()
    const feedback = await status.textContent()
    await finish()
    await expect(page.getByRole('button', { name: tool.copy, exact: true })).toBeVisible()
    await expect(status).toHaveText(feedback ?? '')
    await expect(editor).toHaveValue('')
    await editor.fill(tool.id === 'json' ? '{}' : 'pending local')
    if (tool.action) await page.getByRole('button', { name: tool.action, exact: true }).click()
    await page.getByRole('button', { name: tool.copy, exact: true }).click()
    await page.getByRole('link', { name: 'WorkDev Tools，返回首页' }).click()
    await expect(page).toHaveURL(origin + '/')
    await finish()
    await page.goBack()
    await expect(editor).toHaveValue('')
    await expect(status).toHaveText('')
  })
}

test('E09 键盘跳转焦点与基础语义', async ({ page, browserName }) => {
  // macOS WebKit默认Tab不聚焦链接/按钮，Option+Tab提供完整键盘导航。
  const tabKey = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
  await page.goto('/')
  await hydrated(page)
  await page.keyboard.press(tabKey)
  const skip = page.getByRole('link', { name: '跳转到主内容' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.goto('/developer/url-encoder/')
  await hydrated(page)
  const editor = page.getByLabel('输入或粘贴文本', { exact: true })
  await editor.focus()
  await page.keyboard.type('a b')
  await page.keyboard.press(tabKey)
  await expect(page.getByLabel('处理模式', { exact: true })).toBeFocused()
  await page.keyboard.press(tabKey)
  const encode = page.getByRole('button', { name: '编码', exact: true })
  await expect(encode).toBeFocused()
  expect(await encode.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('处理结果（只读）')).toHaveValue('a%20b')
  await expect(page.locator('#url-status')).toHaveAttribute('aria-live', 'polite')
  await expect(page.getByLabel('处理结果（只读）')).toHaveAttribute('readonly', '')
})

for (const width of [375, 768, 1440]) {
  test('E09 响应式与本地内容隐私 ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ colorScheme: 'dark' })
    const requests: string[] = []
    const logs: string[] = []
    page.on('request', request => requests.push(request.url() + (request.postData() ?? '')))
    page.on('console', message => logs.push(message.text()))
    await page.goto('/developer/url-encoder/')
    await hydrated(page)
    const marker = 'SYNTHETIC_LOCAL_ONLY_8462'
    await page.getByLabel('输入或粘贴文本', { exact: true }).fill(marker.repeat(20))
    await page.getByRole('button', { name: '编码', exact: true }).click()
    await expect(page.getByLabel('处理结果（只读）')).toHaveValue(marker.repeat(20))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(requests.some(value => value.includes(marker))).toBe(false)
    expect(logs.some(value => value.includes(marker))).toBe(false)
    expect(page.url()).not.toContain(marker)
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie])).toEqual([0, 0, ''])
  })
}

for (const locale of ['en-US', 'zh-CN']) {
  test.describe('E10 locale ' + locale, () => {
    test.use({ locale })
    test('E10 固定数字展示', async ({ page }) => {
      await page.goto('/office/text-statistics/')
      await hydrated(page)
      await page.getByLabel('输入或粘贴文本', { exact: true }).fill('a'.repeat(1000))
      await expect(page.locator('dd').first()).toHaveText('1,000')
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    })
  })
}

test.describe('E09 外部请求保护负向夹具', () => {
  test.use({ expectExternalBlock: true })
  test('E09 非loopback请求在发送前被拒绝', async ({ page, diagnostics }) => {
    await page.goto('/')
    await hydrated(page)
    const rejected = await page.evaluate(async () => {
      try { await fetch('https://synthetic-blocked.invalid/probe'); return false }
      catch { return true }
    })
    expect(rejected).toBe(true)
    expect(diagnostics.external).toBe(1)
  })
})
