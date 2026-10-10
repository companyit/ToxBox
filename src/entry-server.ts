import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory } from 'vue-router'
import { createSiteApp } from './app'
import { getPage, pages } from './data/pages'
import { createPageHead } from './utils/seo'
import { routes } from './router/routes'
export { pages }
export const routeCatalog = routes.filter(route => route.name !== 'not-found').map(route => ({ path: route.path, routeName: route.name }))
export async function render(path: string) {
  const { app, router } = createSiteApp(createMemoryHistory())
  await router.push(path)
  await router.isReady()
  if (pages.some(p => p.path === path) && router.currentRoute.value.name !== pages.find(p => p.path === path)?.routeName) throw Error('路由与页面目录不一致')
  const context: { modules?: Set<string> } = {}
  const body = await renderToString(app, context)
  return { body, head: createPageHead(getPage(router.currentRoute.value.name), { mode: 'preview' }), modules: [...(context.modules ?? [])] }
}
