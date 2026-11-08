import type { RouteRecordRaw, LocationQueryRaw } from 'vue-router'
import { canonicalPath, pages } from '../data/pages.ts'
const components = {
  'image-crop': () => import('../views/pages/ImageCropPage.vue'),
  'pdf-organizer': () => import('../views/pages/PdfOrganizerPage.vue'),
  'text-workbench': () => import('../views/pages/TextWorkbenchPage.vue'),
  'text-diff': () => import('../views/pages/TextDiffPage.vue'),
  'json-yaml': () => import('../views/pages/JsonYamlPage.vue'),
  'image-convert': () => import('../views/pages/ImageConvertPage.vue'),
  'images-to-pdf': () => import('../views/pages/ImagesToPdfPage.vue'),
  'date-calculator': () => import('../views/pages/DateCalculatorPage.vue'),
  'csv-json': () => import('../views/pages/CsvJsonPage.vue'),
  'text-cleanup': () => import('../views/pages/TextCleanupPage.vue'),
  'pdf-split': () => import('../views/pages/PdfSplitPage.vue'),
  'word-to-pdf': () => import('../views/pages/WordToPdfPage.vue'),
  'pdf-merge': () => import('../views/pages/PdfMergePage.vue'),
  contact: () => import('../views/pages/ContactPage.vue'),
  terms: () => import('../views/pages/TermsPage.vue'),
  uuid: () => import('../views/pages/UuidPage.vue'),
  timestamp: () => import('../views/pages/TimestampPage.vue'),
  base64: () => import('../views/pages/Base64Page.vue'),
  totp: () => import('../views/pages/TotpPage.vue'),
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
