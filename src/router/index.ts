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
    return target ? { el: target, top: 24 } : { top: 0, left: 0 }
  },
})
router.beforeEach(normalizeKnownPath)

return router
}
