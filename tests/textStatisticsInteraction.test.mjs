// 使用已安装的 Vue 编译器与自定义渲染宿主验证事件逻辑；不替代真实浏览器验收。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import { createRenderer, markRaw, nextTick } from 'vue'

const source = await readFile(new URL('../src/views/TextStatisticsView.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const compiled = compileScript(descriptor, { id: 'text-statistics-test', inlineTemplate: true })
const script = ts.transpileModule(compiled.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replaceAll('"vue"', JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'vue'", JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'@/utils/textStatistics'", JSON.stringify(new URL('../src/utils/textStatistics.ts', import.meta.url).href))
const { default: Component } = await import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`)

function mountTool(t, clipboard = undefined) {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } })
  const root = { children: [] }
  let focused = null
  let selected = false
  function node(tag, text = '') {
    return markRaw({ tag, text, children: [], props: {}, parent: null, focus() { focused = this }, select() { selected = true } })
  }
  const renderer = createRenderer({
    createElement: tag => node(tag),
    createText: text => node('#text', text),
    createComment: text => node('#comment', text),
    setText: (n, text) => { n.text = text },
    setElementText: (n, text) => { n.text = text; n.children = [] },
    patchProp: (n, key, _old, value) => { n.props[key] = value },
    insert(n, parent, anchor = null) {
      if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1)
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, n)
      n.parent = parent
    },
    remove(n) { n.parent.children.splice(n.parent.children.indexOf(n), 1); n.parent = null },
    parentNode: n => n.parent,
    nextSibling: n => n.parent?.children[n.parent.children.indexOf(n) + 1] ?? null,
  })
  const app = renderer.createApp(Component)
  app.mount(root)
  function descendants(n = root) { return n.children.flatMap(child => [child, ...descendants(child)]) }
  function content(n) { return n.text + n.children.map(content).join('') }
  const editor = () => descendants().find(n => n.tag === 'textarea')
  const button = label => descendants().find(n => n.tag === 'button' && content(n) === label)
  const status = () => content(descendants().find(n => n.props.id === 'statistics-status'))
  const values = () => descendants().filter(n => n.tag === 'dd').map(content)
  const input = async value => { editor().props.onInput({ target: { value } }); await nextTick() }
  t.after(() => {
    app.unmount()
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
  })
  return { app, editor, button, status, values, input, focused: () => focused, selected: () => selected }
}

test('empty/example/nonempty guard/clear', async t => {
  const tool = mountTool(t)
  assert.deepEqual(tool.values(), ['0','0','0','0','0'])
  assert.equal(tool.button('清空').props.disabled, true)
  tool.button('填入示例').props.onClick()
  await nextTick()
  assert.equal(tool.editor().props.value, '你好 world\nVue 3')
  assert.equal(tool.button('填入示例').props.disabled, true)
  await tool.input(' ')
  tool.button('填入示例').props.onClick()
  await nextTick()
  assert.equal(tool.editor().props.value, ' ')
  tool.button('清空').props.onClick()
  await nextTick()
  assert.deepEqual(tool.values(), ['0','0','0','0','0'])
  assert.equal(tool.focused(), tool.editor())
})
test('composition hides stale numbers until compositionend', async t => {
  const tool = mountTool(t)
  tool.editor().props.onCompositionstart()
  await tool.input('你好')
  assert.deepEqual(tool.values(), ['—','—','—','—','—'])
  assert.match(tool.status(), /输入中/)
  tool.editor().props.onCompositionend({ target: { value: '你好' } })
  await nextTick()
  assert.deepEqual(tool.values(), ['2','2','1','1','1'])
})
test('over limit preserves text and invalidates results, then recovers', async t => {
  const tool = mountTool(t)
  await tool.input('a'.repeat(100001))
  assert.equal(tool.editor().props.value.length, 100001)
  assert.deepEqual(tool.values(), ['—','—','—','—','—'])
  assert.equal(tool.editor().props['aria-invalid'], 'true')
  await tool.input('abc')
  assert.deepEqual(tool.values(), ['3','3','1','1','1'])
})
test('clipboard missing selects full text even above limit', async t => {
  const tool = mountTool(t)
  await tool.input('a'.repeat(100001))
  await tool.button('复制文本').props.onClick()
  await nextTick()
  assert.equal(tool.selected(), true)
  assert.equal(tool.focused(), tool.editor())
  assert.match(tool.status(), /请选中文本后手动复制/)
  assert.match(tool.status(), /输入超过/)
})
test('clipboard rejection preserves input and shows fallback', async t => {
  const tool = mountTool(t, { writeText: async () => { throw new Error('denied') } })
  await tool.input(' hello ')
  await tool.button('复制文本').props.onClick()
  await nextTick()
  assert.equal(tool.editor().props.value, ' hello ')
  assert.equal(tool.selected(), true)
  assert.match(tool.status(), /手动复制/)
})
test('clipboard success copies exact text', async t => {
  let copied
  const tool = mountTool(t, { writeText: async value => { copied = value } })
  await tool.input(' hello\n ')
  await tool.button('复制文本').props.onClick()
  await nextTick()
  assert.equal(copied, ' hello\n ')
  assert.match(tool.status(), /文本已复制/)
})
test('pending copy cannot overwrite clear feedback or submit twice', async t => {
  let finish
  let calls = 0
  const tool = mountTool(t, { writeText: () => { calls++; return new Promise(resolve => { finish = resolve }) } })
  await tool.input('abc')
  const copy = tool.button('复制文本').props.onClick
  const pending = copy()
  await copy()
  assert.equal(calls, 1)
  tool.button('清空').props.onClick()
  finish()
  await pending
  await nextTick()
  assert.equal(tool.status(), '文本已清空。')
  assert.equal(tool.editor().props.value, '')
})
test('unmount during pending clipboard promise is safe', async t => {
  let finish
  const tool = mountTool(t, { writeText: () => new Promise(resolve => { finish = resolve }) })
  await tool.input('abc')
  const pending = tool.button('复制文本').props.onClick()
  tool.app.unmount()
  finish()
  await pending
})
