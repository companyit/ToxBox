import { isSensitiveRoute } from './sensitivePages'
import type { Router } from 'vue-router'
import { getPage } from '../data/pages'

const productionOrigin = 'https://www.v7luck.com'
const measurementId = 'G-FT0EKJ0B5K'
type AnalyticsWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

// 统计独立于 SEO 索引模式；仅发布构建在正式 origin 启用。
export function startAnalytics(router: Router, releaseBuild: boolean, target: Window = window) {
  if (!releaseBuild || target.location.origin !== productionOrigin || isSensitiveRoute(router.currentRoute.value.name)) return
  const client = target as AnalyticsWindow
  if (client.document.getElementById('workdev-google-tag')) return
  client.dataLayer ??= []
  const gtag = function (..._args: unknown[]) { client.dataLayer!.push(arguments) }
  client.gtag = gtag
  let previousLocation = ''
  let previousName: unknown
  const report = (name: unknown) => {
    if (name === previousName) return
    const page = getPage(name)
    const location = `${productionOrigin}${page.path || '/404/'}`
    const parameters = { page_location: location, page_title: page.title, page_referrer: previousLocation }
    // 同步全局上下文，避免后续自动事件重新读取原始 URL。
    gtag('set', parameters)
    gtag('event', 'page_view', { ...parameters, send_to: measurementId })
    previousName = name
    previousLocation = location
  }
  const initial = getPage(router.currentRoute.value.name)
  gtag('js', new Date())
  gtag('config', measurementId, {
    send_page_view: false,
    page_location: `${productionOrigin}${initial.path || '/404/'}`,
    page_title: initial.title,
    page_referrer: '',
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
  report(router.currentRoute.value.name)
  router.afterEach((to, _from, failure) => { if (!failure) report(to.name) })
  const script = client.document.createElement('script')
  script.id = 'workdev-google-tag'
  script.async = true
  script.referrerPolicy = 'no-referrer'
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  client.document.head.append(script)
}
