import './assets/main.css'
import { createWebHistory } from 'vue-router'
import { createSiteApp } from './app'
import { startAnalytics } from './utils/analytics'
import { legacyToolPath } from './utils/legacyToolLinks'
// Resolve obsolete home anchors before hydration or analytics; the destination gets its own document.
const legacyPath = legacyToolPath(window.location.pathname, window.location.hash)
if (legacyPath) {
  window.location.replace(legacyPath)
} else {
  const hydrate = document.getElementById('app')?.dataset.renderMode === 'ssg'
  const { app, router } = createSiteApp(createWebHistory(import.meta.env.BASE_URL), hydrate, true)
  await router.isReady()
  app.mount('#app')

  startAnalytics(router, import.meta.env.PROD)
}
