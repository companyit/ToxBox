import { test as base, expect, type Page } from '@playwright/test'
import { pages, notFoundPage } from '../src/data/pages'

export { expect, pages, notFoundPage }
export const origin = 'http://127.0.0.1:4177'
export const toolCases = [
  { id: 'text', path: '/office/text-statistics/', input: '输入或粘贴文本', prefix: 'statistics', copy: '复制文本', action: '' },
  { id: 'json', path: '/developer/json-formatter/', input: '输入或粘贴 JSON', prefix: 'json', copy: '复制结果', action: '压缩' },
  { id: 'url', path: '/developer/url-encoder/', input: '输入或粘贴文本', prefix: 'url', copy: '复制结果', action: '编码' },
] as const

export function isMismatch(message: string) { return /hydration|hydrate/i.test(message) && /mismatch|不匹配/i.test(message) }
type Diagnostics = { mismatch: string[]; errors: string[]; external: number; resources: string[]; expectedBlockErrors: number }
export const test = base.extend<{ diagnostics: Diagnostics; expectHydrationMismatch: boolean; expectExternalBlock: boolean }>({
  expectHydrationMismatch: [false, { option: true }],
  expectExternalBlock: [false, { option: true }],
  diagnostics: [async ({ context, page, browser, expectHydrationMismatch, expectExternalBlock }, use, info) => {
    const diagnostics: Diagnostics = { mismatch: [], errors: [], external: 0, resources: [], expectedBlockErrors: 0 }
    const observed = new Set<Page>()
    const observe = (tab: Page) => {
      if (observed.has(tab)) return
      observed.add(tab)
      tab.on('console', message => {
        if (expectExternalBlock && /Cross-Origin Request Blocked/.test(message.text()) && message.text().includes('https://synthetic-blocked.invalid/probe')) { diagnostics.expectedBlockErrors++; return }
        if (isMismatch(message.text())) diagnostics.mismatch.push(message.type())
        else if (message.type() === 'error' && !/Failed to load resource|404 \(Not Found\)/i.test(message.text())) diagnostics.errors.push('console.error')
      })
      tab.on('pageerror', () => diagnostics.errors.push('pageerror'))
      tab.on('response', response => {
        if (response.request().resourceType() !== 'document' && new URL(response.url()).pathname.startsWith('/assets/') && response.status() >= 400) diagnostics.resources.push(String(response.status()))
      })
    }
    observe(page)
    context.on('page', observe)
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin === origin) await route.continue()
      else { diagnostics.external++; await route.abort('blockedbyclient') }
    })
    await use(diagnostics)
    await info.attach('运行摘要', { body: JSON.stringify({ browser: browser.version(), project: info.project.name, ...diagnostics }), contentType: 'application/json' })
    expect(diagnostics.external, '外部请求监测').toBe(expectExternalBlock ? 1 : 0)
    expect(diagnostics.errors, '运行时异常').toEqual([])
    expect(diagnostics.resources, '静态资源加载失败').toEqual([])
    if (expectHydrationMismatch) expect(diagnostics.mismatch.length, '负向夹具必须被公共检测器发现').toBeGreaterThan(0)
    else expect(diagnostics.mismatch, 'Hydration mismatch').toEqual([])
  }, { auto: true }],
})

export async function hydrated(page: Page) {
  await expect.poll(() => page.evaluate(() => Boolean((document.querySelector('#app') as HTMLElement & { __vue_app__?: unknown })?.__vue_app__))).toBe(true)
}
export async function metadata(page: Page, definition: typeof pages[number]) {
  await expect(page).toHaveTitle(definition.title)
  await expect(page.locator('meta[name="description"]')).toHaveCount(1)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', definition.description)
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(definition.routeName === 'home' ? '让日常工作，轻松一点。' : definition.heading)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow')
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
}
