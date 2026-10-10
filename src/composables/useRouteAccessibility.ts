import { nextTick, onUnmounted, ref } from 'vue'
import type { Router } from 'vue-router'
import { getPage } from '@/data/pages'
import { applyPageHead, createPageHead } from '@/utils/seo'
import { hashTarget } from '@/router'

export function useRouteAccessibility(router: Router) {
  const announcement = ref('')
  const navigationError = ref(false)
  let failedTarget = '/'
  let revision = 0
  let pendingFullPath = ''
  const removeBefore = router.beforeEach(to => { revision++; pendingFullPath = to.fullPath; navigationError.value = false })
  const removeAfter = router.afterEach(async (to, from, failure) => {
    if (failure) return
    const current = revision
    applyPageHead(document, createPageHead(getPage(to.name), { mode: 'preview' }))
    await nextTick()
    if (current !== revision || to.fullPath !== router.currentRoute.value.fullPath) return
    const target = hashTarget(to.hash)
    // 初次加载不抢焦点，后续导航防止focus覆盖滚动恢复。
    if (from.name !== undefined) {
      const focus = target ?? document.querySelector<HTMLElement>('main h1') ?? document.getElementById('main-content')
      if (focus) { focus.setAttribute('tabindex', '-1'); focus.focus({ preventScroll: true }) }
      if (to.name !== from.name) announcement.value = `已进入：${getPage(to.name).heading}`
    }
  })
  const removeError = router.onError((_error, to) => {
    if (to.fullPath !== pendingFullPath) return
    revision++; failedTarget = to.fullPath; navigationError.value = true
  })
  function retry() { void router.replace(failedTarget).catch(() => { /* 当前导航错误由onError处理，忽略过期重试。 */ }) }
  onUnmounted(() => { revision++; removeBefore(); removeAfter(); removeError() })
  return { announcement, navigationError, retry }
}
