import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { expect, test, vi } from 'vitest'
import { interactionReadyKey } from '../../src/interactionReady'
import RegexTesterPage from '../../src/views/pages/RegexTesterPage.vue'
import type { RegexResult } from '../../src/utils/regexTester'

test('editing and unmounting terminate jobs and ignore stale worker results', async () => {
  const jobs: FakeWorker[] = []
  class FakeWorker {
    onmessage?: (event: MessageEvent<RegexResult>) => void
    postMessage = vi.fn()
    terminate = vi.fn()
    constructor() { jobs.push(this) }
  }
  vi.stubGlobal('Worker', FakeWorker)
  const wrapper = mount(RegexTesterPage, {
    global: { provide: { [interactionReadyKey as symbol]: ref(true) }, stubs: ['RouterLink'] },
  })
  try {
    const pattern = wrapper.get('#regex-pattern')
    const run = wrapper.get('button.primary')
    const status = wrapper.get('#regex-status')
    await pattern.setValue('a')
    await run.trigger('click')
    const first = jobs[0]!
    expect(status.text()).toBe('正在匹配…')
    await wrapper.get('input[value="i"]').setValue(true)
    expect(first.terminate).toHaveBeenCalledOnce()

    await run.trigger('click')
    const second = jobs[1]!
    expect(second.postMessage).toHaveBeenCalledWith({ pattern: 'a', sample: '', flags: ['i'] })
    first.onmessage?.(new MessageEvent('message', { data: { error: '过期消息' } }))
    await nextTick()
    expect(status.text()).toBe('正在匹配…')

    window.dispatchEvent(new Event('pagehide'))
    expect(second.terminate).toHaveBeenCalledOnce()
    second.onmessage?.(new MessageEvent('message', { data: { error: '离页后的消息' } }))
    await nextTick()
    expect(status.text()).toBe('')
    expect((pattern.element as HTMLTextAreaElement).value).toBe('')

    await pattern.setValue('b')
    await run.trigger('click')
    wrapper.unmount()
    expect(jobs[2]!.terminate).toHaveBeenCalledOnce()
  } finally {
    if (wrapper.exists()) wrapper.unmount()
    vi.unstubAllGlobals()
  }
})
