import assert from 'node:assert/strict'
import { afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, type Component, type VNode } from 'vue'

type ClipboardStub = { writeText: (text: string) => unknown; readText?: () => unknown }
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

export function mountDomTool(component: Component, prefix: string, clipboard?: ClipboardStub, secure = true) {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  const originalSecure = Object.getOwnPropertyDescriptor(window, 'isSecureContext')
  const cancellations: (() => void)[] = []
  // 断言失败也能卸载后结束受控等待；原Promise仍绑定reject处理，避免迟到未处理异常。
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard && {
    ...clipboard,
    writeText(text: string) {
      return Promise.race([Promise.resolve(clipboard.writeText(text)), new Promise<void>(resolve => cancellations.push(resolve))])
    },
  } })
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: secure })
  const container = document.createElement('div')
  document.body.append(container)
  const wrapper = mount(component, { attachTo: container })
  let unmounted = false
  const unmount = () => { if (!unmounted) { wrapper.unmount(); unmounted = true } }
  const editor = () => wrapper.get<HTMLTextAreaElement>(`#${prefix}-input`).element
  const outputEditor = () => wrapper.get<HTMLTextAreaElement>(`#${prefix}-output`).element
  const select = () => wrapper.get<HTMLSelectElement>('select').element
  const buttonWrapper = (label: string) => {
    const button = wrapper.findAll<HTMLButtonElement>('button').find(node => node.text() === label)
    assert.ok(button, `找不到按钮：${label}`)
    return button
  }
  const selectedElements: HTMLTextAreaElement[] = []
  for (const textarea of wrapper.findAll<HTMLTextAreaElement>('textarea')) {
    const element = textarea.element
    const nativeSelect = element.select.bind(element)
    vi.spyOn(element, 'select').mockImplementation(() => { nativeSelect(); selectedElements.push(element) })
  }
  // 仅底层守卫/竞态断言直接调用真实VNode事件；正常交互用原生DOM事件。
  function invoke(label: string): unknown {
    const element = buttonWrapper(label).element
    function find(node: VNode): VNode | undefined {
      if (node.el === element) return node
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child && typeof child === 'object' && 'type' in child) {
            const found = find(child as VNode)
            if (found) return found
          }
        }
      }
    }
    const vnode = find(wrapper.vm.$.subTree)
    assert.equal(typeof vnode?.props?.onClick, 'function')
    return (vnode!.props!.onClick as () => unknown)()
  }
  cleanups.push(async () => {
    unmount()
    cancellations.forEach(cancel => cancel())
    await flushPromises()
    container.remove()
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
    else Reflect.deleteProperty(navigator, 'clipboard')
    if (originalSecure) Object.defineProperty(window, 'isSecureContext', originalSecure)
    else Reflect.deleteProperty(window, 'isSecureContext')
  })
  return {
    app: { unmount }, editor, outputEditor, indent: select, mode: select,
    output: () => outputEditor().value,
    status: () => wrapper.get(`#${prefix}-status`).text(),
    values: () => wrapper.findAll('dd').map(node => node.text()),
    button: (label: string) => buttonWrapper(label).element,
    invoke,
    async click(label: string) { await buttonWrapper(label).trigger('click'); await flushPromises() },
    async input(value: string) { await wrapper.get(`#${prefix}-input`).setValue(value) },
    compositionStart() { editor().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })) },
    compositionEnd(value: string) { editor().value = value; editor().dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value })) },
    change(value: string) { select().value = value; select().dispatchEvent(new Event('change', { bubbles: true })) },
    focused: () => document.activeElement,
    selected() {
      const element = selectedElements.at(-1)
      if (!element) return false
      assert.equal(element.selectionStart, 0)
      assert.equal(element.selectionEnd, element.value.length)
      return prefix === 'statistics' ? true : element
    },
  }
}
