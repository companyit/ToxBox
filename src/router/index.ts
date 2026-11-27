import { adSenseDocumentTransition } from '../utils/adsense'
import { siteSeoEnvironment } from '../config/seo'
import { legacyToolPath } from '../utils/legacyToolLinks'
import { isSensitivePath, isSensitiveRoute } from '../utils/sensitivePages'
import { nextTick } from 'vue'
import { createRouter, type RouterHistory } from 'vue-router'
import { routes, normalizeKnownPath } from './routes'
export function hashTarget(hash: string): HTMLElement | null {
  try { return hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null } catch { return null }
}
export function createSiteRouter(history: RouterHistory, browser = false) {
const router = createRouter({
  history, routes: routes.map(route => ({ ...route })), strict: true, sensitive: true,
  async scrollBehavior(to, _from, savedPosition) {
    if (!browser) return false
    await nextTick()
    if (router.currentRoute.value.fullPath !== to.fullPath) return false
    if (savedPosition) return savedPosition
    const target = hashTarget(to.hash)
    if (!target) return { top: 0, left: 0 }
    const header = document.querySelector('.site-header')
    const headerOffset = header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().height : 0
    return { el: target, top: headerOffset + 24 }
  },
})
// 敏感页面必须使用独立文档，防止继承其他页面已经执行的 GA 脚本。
const documentPath = browser ? window.location.pathname : ''
const documentIsSensitive = browser && isSensitivePath(documentPath)
if (browser) router.beforeEach(to => {
  const legacyPath = legacyToolPath(to.path, to.hash)
  if (legacyPath) {
    window.location.replace(legacyPath)
    // Do not abort a popstate/hash navigation: Vue Router would rewind history and cancel the replacement.
    // This document is being replaced, so its pending navigation must not mount or start analytics.
    return new Promise<never>(() => {})
  }

  if (adSenseDocumentTransition(documentPath, to.path, siteSeoEnvironment)) {
    window.location.assign(to.fullPath)
    return new Promise<never>(() => {})
  }
  if (isSensitiveRoute(to.name) !== documentIsSensitive) {
    window.location.assign(to.fullPath)
    return false
  }
})
router.beforeEach(normalizeKnownPath)

return router
}
