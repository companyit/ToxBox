import { test, expect, pages, notFoundPage, hydrated, metadata, origin, toolCases } from './helpers'
import fs from 'node:fs/promises'

test.describe('E01 无JavaScript静态可读', () => {
  test.use({ javaScriptEnabled: false })
  for (const definition of [...pages, ...['/missing/', '/office/missing/', '/developer/missing/'].map(path => ({ ...notFoundPage, path }))]) {
    test('E01 ' + (definition.routeName === 'not-found' ? definition.path : definition.routeName), async ({ page }) => {
      const response = await page.goto(definition.path)
      expect(response?.status()).toBe(definition.routeName === 'not-found' ? 404 : 200)
      expect(await response!.text()).toContain('data-render-mode="ssg"')
      await metadata(page, definition)
      await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
      // Playwright的通用elementText会跳过NOSCRIPT，直接验证解析后的子段落和DOM文本。
      await expect(page.locator('noscript > p')).toBeVisible()
      expect(await page.locator('noscript').evaluate(node => node.textContent)).toContain('工具交互需要 JavaScript')
      for (const input of await page.getByRole('textbox').all()) { await expect(input).toHaveValue(''); await expect(input).toBeDisabled() }
      await expect(page.getByRole('main')).not.toContainText('missing')
    })
  }
})

for (const definition of pages) {
  test('E02 直达刷新与SEO ' + definition.routeName, async ({ page }) => {
    const response = await page.goto(definition.path)
    expect(response?.status()).toBe(200)
    await hydrated(page)
    await metadata(page, definition)
    await page.reload()
    await hydrated(page)
    await metadata(page, definition)
    await expect(page.getByRole('main')).toBeVisible()
    if (definition.routeName === 'home') await expect(page.getByRole('textbox')).toHaveCount(0)
  })
}

for (const tool of toolCases) {
  test('E03 延迟脚本节点复用与禁用保护 ' + tool.id, async ({ page }) => {
    let release!: () => void
    let requested!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const seen = new Promise<void>(resolve => { requested = resolve })
    await page.route('**/assets/*.js', async route => { requested(); await gate; await route.continue() })
    try {
      await page.goto(tool.path, { waitUntil: 'commit' })
      await seen
      const editor = page.getByLabel(tool.input, { exact: true })
      await expect(editor).toBeDisabled()
      const nodes = await page.locator('main, h1, textarea').elementHandles()
      await page.keyboard.press('Tab')
      await page.keyboard.type('synthetic')
      await expect(editor).toHaveValue('')
      release()
      await hydrated(page)
      await expect(editor).toBeEnabled()
      for (const node of nodes) expect(await node.evaluate(element => element instanceof Element && element.isConnected && document.querySelector(element.id ? '#' + element.id : element.tagName.toLowerCase()) === element)).toBe(true)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await editor.fill(tool.id === 'json' ? '{}' : '你好')
      await expect(editor).toHaveValue(tool.id === 'json' ? '{}' : '你好')
    } finally { release() }
  })
}

test.describe('E04 检测器负向夹具', () => {
  test.use({ expectHydrationMismatch: true })
  test('E04 结构破坏必须触发mismatch', async ({ page, diagnostics }) => {
    await page.route(origin + '/', async route => {
      const response = await route.fetch()
      const html = (await response.text()).replace('<main ', '<article ').replace('</main>', '</article>')
      await route.fulfill({ response, body: html })
    })
    await page.goto('/')
    await hydrated(page)
    await expect.poll(() => diagnostics.mismatch.length).toBeGreaterThan(0)
    await expect(page.getByRole('main')).toHaveCount(1)
  })
})

test('E06 站内导航历史与状态卸载', async ({ page }) => {
  await page.goto('/office/text-statistics/')
  await hydrated(page)
  await page.getByLabel('输入或粘贴文本', { exact: true }).fill('synthetic local')
  await page.getByRole('link', { name: 'JSON 格式化与校验', exact: true }).click()
  await expect(page).toHaveURL(origin + '/developer/json-formatter/')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await page.getByLabel('输入或粘贴 JSON', { exact: true }).fill('{}')
  await page.goBack()
  await expect(page.getByLabel('输入或粘贴文本', { exact: true })).toHaveValue('')
  await page.goForward()
  await expect(page.getByLabel('输入或粘贴 JSON', { exact: true })).toHaveValue('')
  await page.getByRole('link', { name: 'WorkDev Tools，返回首页' }).click()
  await expect(page).toHaveURL(origin + '/')
  for (const name of ['打开文本统计', '打开JSON 格式化与校验', '打开URL 编解码']) await expect(page.getByRole('link', { name, exact: true })).toBeVisible()
})

test('E06 无斜杠308与旧hash', async ({ page, request }) => {
  const response = await request.get(origin + '/office?sample=1', { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  expect(response.headers().location).toBe('/office/?sample=1')
  await page.goto('/office?sample=1#help')
  await expect(page).toHaveURL(origin + '/office/?sample=1#help')
  for (const hash of ['office-tools', 'developer-tools', 'privacy', 'text-statistics', 'json-formatter', 'url-encoder']) {
    await page.goto('/#' + hash)
    await hydrated(page)
    await expect(page.locator('#' + hash)).toHaveCount(1)
    await expect(page.getByRole('textbox')).toHaveCount(0)
  }
})

for (const path of ['/missing/', '/office/missing/', '/developer/missing/']) {
  test('E07 真实HTTP404 ' + path, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(404)
    expect(response?.headers()['content-type']).toContain('text/html')
    await hydrated(page)
    await metadata(page, notFoundPage)
    await expect(page.getByRole('main')).not.toContainText('missing')
    await page.getByRole('main').getByRole('link', { name: '返回首页' }).click()
    await expect(page).toHaveURL(origin + '/')
  })
}

test('E08 实际静态资源与禁止泄漏文件', async ({ request }) => {
  const files = await fs.readdir('dist-ssg', { recursive: true })
  const htmlFiles = files.filter(file => file.endsWith('.html'))
  expect(htmlFiles).toHaveLength(9)
  const resources = new Set<string>()
  for (const file of htmlFiles) {
    const html = await fs.readFile('dist-ssg/' + file, 'utf8')
    for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"#?]+|\/favicon.ico)"/g)) resources.add(match[1]!)
  }
  const manifest = JSON.parse(await fs.readFile('.ssg-build/client/.vite/ssr-manifest.json', 'utf8')) as Record<string, string[]>
  for (const resource of Object.values(manifest).flat()) resources.add(resource)
  for (const resource of resources) {
    expect(resource.startsWith('/assets/') || resource === '/favicon.ico').toBe(true)
    await fs.access('dist-ssg' + resource)
    const response = await request.get(origin + resource, { maxRedirects: 0 })
    expect(response.status()).toBe(200)
    const mime = response.headers()['content-type']
    if (resource.endsWith('.js')) expect(mime).toMatch(/javascript/)
    if (resource.endsWith('.css')) expect(mime).toMatch(/text\/css/)
    expect(await response.body()).not.toHaveLength(0)
  }
  for (const forbidden of ['entry-server.js', 'sitemap.xml', 'robots.txt']) expect(files).not.toContain(forbidden)
  for (const missing of ['/assets/MISSING.js', '/api/v1/example']) {
    const response = await request.get(origin + missing, { maxRedirects: 0 })
    expect(response.status()).toBe(404)
  }
})
