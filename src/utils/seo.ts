import type { PageDefinition, PageName } from '../data/pages.ts'
import { approvedIndexablePages } from './seoEnvironment.ts'
import type { SeoEnvironment } from '../types/seo'
export type { SeoEnvironment } from '../types/seo'
export type OpenGraphProperty = 'og:title' | 'og:description' | 'og:url' | 'og:type' | 'og:site_name' | 'og:locale'
export interface PageHead {
  title: string; description: string; robots: string; canonical?: string
  openGraph?: Readonly<Record<OpenGraphProperty, string>>
}
export function createPageHead(page: PageDefinition, environment: SeoEnvironment): PageHead {
  if (!['local', 'preview', 'production'].includes(environment.mode)) throw new Error('SEO环境模式无效。')
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
  const approved = approvedIndexablePages.some(known => known.routeName === page.routeName && known.path === page.path)
  const names = environment.indexableRouteNames
  if (names && (new Set(names).size !== names.length || names.some(name => !approvedIndexablePages.some(known => known.routeName === name)))) {
    throw new Error('SEO索引清单包含重复或未批准页面。')
  }
  const indexable = Boolean(origin && page.indexable && approved && (!names || names.includes(page.routeName as PageName)))
  const canonical = indexable ? origin! + page.path : undefined
  return {
    title: page.title, description: page.description,
    robots: indexable ? 'index,follow' : 'noindex,follow',
    ...(canonical ? { canonical, openGraph: {
      'og:title': page.title, 'og:description': page.description, 'og:url': canonical,
      'og:type': 'website', 'og:site_name': 'WorkDev Tools', 'og:locale': 'zh_CN',
    } } : {}),
  }
}
// 纯模型可用于两种构建环境；SSR/client生产接线属于后续批次。
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
  const managed: readonly OpenGraphProperty[] = ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:locale']
  for (const property of managed) {
    const existing = [...document.head.querySelectorAll<HTMLMetaElement>(`meta[property="${property}"]`)]
    const value = head.openGraph?.[property]
    if (value === undefined) { existing.forEach(node => node.remove()); continue }
    const element = existing.shift() ?? document.createElement('meta')
    existing.forEach(node => node.remove())
    element.setAttribute('property', property)
    element.content = value
    document.head.append(element)
  }
}
