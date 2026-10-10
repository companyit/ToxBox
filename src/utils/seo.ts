import type { PageDefinition } from '../data/pages.ts'
export interface SeoEnvironment { readonly mode: 'local' | 'preview' | 'production'; readonly approvedOrigin?: string }
export interface PageHead { title: string; description: string; robots: string; canonical?: string }
export function createPageHead(page: PageDefinition, environment: SeoEnvironment): PageHead {
  let origin: string | undefined
  if (environment.mode === 'production') {
    const value = environment.approvedOrigin
    if (!value) throw new Error('正式 SEO 配置缺少已批准域名。')
    let url: URL
    try { url = new URL(value) } catch { throw new Error('正式 SEO 域名配置无效。') }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '') || value !== url.origin) {
      throw new Error('正式 SEO 配置必须是已批准的 HTTPS origin。')
    }
    origin = url.origin
  }
  return {
    title: page.title, description: page.description,
    robots: environment.mode === 'production' && page.indexable ? 'index,follow' : 'noindex,follow',
    ...(origin && page.indexable ? { canonical: origin + page.path } : {}),
  }
}
// 原始HTML、客户端和未来预渲染共用同一head模型；当前仅接入预览模式。
export function applyPageHead(document: Document, head: PageHead): void {
  document.title = head.title
  document.documentElement.lang = 'zh-CN'
  for (const [name, content] of [['description', head.description], ['robots', head.robots]]) {
    const existing = [...document.head.querySelectorAll<HTMLMetaElement>(`meta[name="${name}"]`)]
    const element = existing.shift() ?? document.createElement('meta')
    existing.forEach(node => node.remove())
    element.name = name!
    element.content = content!
    document.head.append(element)
  }
  const canonicals = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')]
  canonicals.forEach(node => node.remove())
  if (head.canonical) {
    const element = document.createElement('link')
    element.rel = 'canonical'; element.href = head.canonical
    document.head.append(element)
  }
}
