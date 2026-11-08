import { beforeEach, expect, test } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { startAnalytics } from '../../src/utils/analytics'

beforeEach(() => {
  document.getElementById('workdev-google-tag')?.remove()
  Reflect.deleteProperty(window, 'dataLayer')
})
async function setup() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', name: 'home', component: {} },
    { path: '/privacy/', name: 'privacy', component: {} },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: {} },
  ] })
  await router.push('/?secret=PRIVATE#PRIVATE')
  await router.isReady()
  return router
}
test('非正式环境和非正式 origin 不加载统计', async () => {
  const router = await setup()
  startAnalytics(router, false)
  startAnalytics(router, true)
  expect(document.getElementById('workdev-google-tag')).toBeNull()
})
test('单次初始化、脱敏、成功导航统计与重复导航去重', async () => {
  const router = await setup()
  const productionOrigin = 'https://www.v7luck.com'
  const target = { document, location: { origin: productionOrigin } } as unknown as Window
  startAnalytics(router, true, target)
  startAnalytics(router, true, target)
  await router.push('/privacy/?secret=PRIVATE#PRIVATE')
  await router.push('/privacy/?secret=SECOND')
  await router.push('/PRIVATE?secret=PRIVATE')
  const queue = (target as unknown as { dataLayer: IArguments[] }).dataLayer.map(item => Array.from(item))
  const events = queue.filter(item => item[0] === 'event')
  expect(events).toHaveLength(3)
  expect(events.map(item => (item[2] as {page_location: string}).page_location)).toEqual([
    `${productionOrigin}/`, `${productionOrigin}/privacy/`, `${productionOrigin}/404/`,
  ])
  expect(JSON.stringify(queue)).not.toContain('PRIVATE')
  expect(JSON.stringify(queue)).not.toContain('SECOND')
  expect(queue.find(item => item[0] === 'config')?.[2]).toMatchObject({ send_page_view: false, page_referrer: '' })
  expect(document.querySelectorAll('#workdev-google-tag')).toHaveLength(1)
})

test('敏感 TOTP 页面不初始化第三方统计', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/developer/2fa/', name: 'totp', component: {} }] })
  await router.push('/developer/2fa/'); await router.isReady()
  const target = { document, location: { origin: 'https://www.v7luck.com' } } as unknown as Window
  startAnalytics(router, true, target)
  expect(document.getElementById('workdev-google-tag')).toBeNull()
  expect(Reflect.has(target, 'dataLayer')).toBe(false)
})

for (const [name, path] of [['image-crop', '/office/image-crop/'], ['text-workbench', '/office/text-workbench/'], ['text-diff', '/office/text-diff/'], ['json-yaml', '/developer/json-yaml/'], ['pdf-split', '/office/pdf-split/'], ['pdf-merge', '/office/pdf-merge/'], ['word-to-pdf', '/office/word-to-pdf/']]) {
 test(`敏感文档 ${name} 即使正式 origin 也不初始化统计`, async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: path!, name, component: {} }] })
  await router.push(path!); await router.isReady()
  const target = { document, location: { origin: 'https://www.v7luck.com' } } as unknown as Window
  startAnalytics(router, true, target)
  expect(document.getElementById('workdev-google-tag')).toBeNull()
  expect(Reflect.has(target, 'dataLayer')).toBe(false)
 })
}
