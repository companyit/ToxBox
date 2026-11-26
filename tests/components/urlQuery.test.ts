import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { expect, test } from 'vitest'
import { interactionReadyKey } from '../../src/interactionReady'
import UrlQueryPage from '../../src/views/pages/UrlQueryPage.vue'

test('displays query data as text and clears editor and results on pagehide', async () => {
  const wrapper = mount(UrlQueryPage, {
    global: { provide: { [interactionReadyKey as symbol]: ref(true) }, stubs: ['RouterLink'] },
  })
  try {
    await wrapper.get('#query-mode').setValue('query')
    const source = wrapper.get<HTMLTextAreaElement>('#query-source')
    await source.setValue('x=%3Cimg%20src%3Dx%3E')
    await wrapper.get('button.primary').trigger('click')
    expect(wrapper.get('tbody').text()).toContain('<img src=x>')
    expect(wrapper.find('tbody img').exists()).toBe(false)

    window.dispatchEvent(new Event('pagehide'))
    await nextTick()
    expect(source.element.value).toBe('')
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.get('#query-status').text()).toBe('')
  } finally {
    wrapper.unmount()
  }
})
