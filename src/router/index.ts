import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes, normalizeKnownPath } from './routes'
export function hashTarget(hash: string): HTMLElement | null {
  try { return hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null } catch { return null }
}
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), routes, strict: true, sensitive: true,
  async scrollBehavior(to, _from, savedPosition) {
    await nextTick()
    if (router.currentRoute.value.fullPath !== to.fullPath) return false
    if (savedPosition) return savedPosition
    const target = hashTarget(to.hash)
    return target ? { el: target, top: 24 } : { top: 0, left: 0 }
  },
})
router.beforeEach(normalizeKnownPath)
