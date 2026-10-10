import { createApp, createSSRApp, ref } from 'vue'
import type { RouterHistory } from 'vue-router'
import App from './App.vue'
import { createSiteRouter } from './router'
import { interactionReadyKey } from './interactionReady'
export function createSiteApp(history: RouterHistory, hydrate = true, browser = false) {
  const app = (hydrate ? createSSRApp : createApp)(App)
  const router = createSiteRouter(history, browser)
  const ready = ref(false)
  app.provide(interactionReadyKey, ready)
  app.use(router)
  return { app, router, ready }
}
