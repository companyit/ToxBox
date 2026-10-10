import type { RouteRecordRaw, LocationQueryRaw } from 'vue-router'
import { canonicalPath, pages } from '../data/pages.ts'
const components = {
  home: () => import('../views/HomeView.vue'),
  office: () => import('../views/pages/CategoryPage.vue'),
  developer: () => import('../views/pages/CategoryPage.vue'),
  'text-statistics': () => import('../views/pages/TextStatisticsPage.vue'),
  'json-formatter': () => import('../views/pages/JsonFormatterPage.vue'),
  'url-encoder': () => import('../views/pages/UrlEncoderPage.vue'),
  about: () => import('../views/pages/AboutPage.vue'),
  privacy: () => import('../views/pages/PrivacyPage.vue'),
}
export const routes: RouteRecordRaw[] = [
  ...pages.map(p => ({ path: p.path, name: p.routeName, component: components[p.routeName as keyof typeof components], props: p.routeName === 'office' || p.routeName === 'developer' ? { category: p.routeName } : false })),
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/pages/NotFoundPage.vue') },
]
export function normalizeKnownPath(to: { path: string; query: LocationQueryRaw; hash: string }) {
  const path = canonicalPath(to.path)
  return path && path !== to.path ? { path, query: to.query, hash: to.hash } : undefined
}
