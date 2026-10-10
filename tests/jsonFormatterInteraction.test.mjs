// 使用已安装的 Vue 编译器与自定义渲染宿主验证事件逻辑；不替代真实浏览器验收。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import { createRenderer, markRaw, nextTick } from 'vue'

const source = await readFile(new URL('../src/views/JsonFormatterView.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const compiled = compileScript(descriptor, { id: 'json-formatter-test', inlineTemplate: true })
const script = ts.transpileModule(compiled.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replaceAll('"vue"', JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'vue'", JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'@/utils/jsonFormatter'", JSON.stringify(new URL('../src/utils/jsonFormatter.ts', import.meta.url).href))
const { default: Component } = await import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`)

function mountTool(t, clipboard = undefined, secure = true) {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: secure } })
  const root = { children: [] }
  let focused = null
  let selected = false
  function node(tag, text = '') {
    return markRaw({ tag, text, children: [], props: {}, parent: null, focus() { focused = this }, select() { selected = this } })
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
  const editor = () => descendants().find(n => n.props.id === 'json-input')
  const button = label => descendants().find(n => n.tag === 'button' && content(n) === label)
  const status = () => content(descendants().find(n => n.props.id === 'json-status'))
  const outputEditor = () => descendants().find(n => n.props.id === 'json-output')
  const output = () => outputEditor().props.value
  const indent = () => descendants().find(n => n.tag === 'select')
  const click = async label => { await button(label).props.onClick(); await nextTick() }
  const input = async value => { editor().props.onInput({ target: { value } }); await nextTick() }
  t.after(() => {
    app.unmount()
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
  })
  return { app, editor, outputEditor, output, indent, click, button, status, input, focused: () => focused, selected: () => selected }
}

test('C01 edit invalidates immediately, illegal and over-limit inputs retained', async t => {
  const tool=mountTool(t)
  await tool.input('{"a":1}');await tool.click('格式化');assert.ok(tool.output())
  await tool.input('{');assert.equal(tool.output(),'');assert.equal(tool.button('复制结果').props.disabled,true)
  await tool.click('格式化');assert.match(tool.status(),/语法错误/);assert.equal(tool.editor().props.value,'{')
  await tool.input('a'.repeat(100001));assert.equal(tool.output(),'');assert.match(tool.status(),/超过/);assert.equal(tool.button('格式化').props.disabled,true)
})
test('C02 composition prevents execution and never auto-parses', async t => {
  const tool=mountTool(t);await tool.input('{}');await tool.click('格式化')
  tool.editor().props.onCompositionstart();await tool.input('{"a":"你好"}');await nextTick()
  assert.equal(tool.output(),'');assert.equal(tool.button('格式化').props.disabled,true)
  await tool.click('格式化');assert.equal(tool.output(),'')
  tool.editor().props.onCompositionend({target:{value:'{"a":"你好"}'}});await nextTick();assert.equal(tool.output(),'')
  await tool.click('压缩');assert.equal(tool.output(),'{"a":"你好"}')
})
test('C03 indent change, minify independence, validate has no output', async t => {
  const tool=mountTool(t);await tool.input('{"a":1}');await tool.click('格式化')
  tool.indent().props.onChange({target:{value:'4'}});await nextTick();assert.equal(tool.output(),'')
  await tool.click('格式化');assert.equal(tool.output(),'{\n    "a": 1\n}')
  await tool.click('压缩');assert.equal(tool.output(),'{"a":1}')
  await tool.click('校验语法');assert.equal(tool.output(),'');assert.match(tool.status(),/语法合法/);assert.equal(tool.button('复制结果').props.disabled,true)
})
test('C04 guarded sample and clear reset/focus', async t => {
  const tool=mountTool(t);assert.equal(tool.button('清空').props.disabled,true)
  await tool.click('填入示例');assert.match(tool.editor().props.value,/WorkDev Tools/);assert.equal(tool.output(),'')
  await tool.input(' ');await tool.click('填入示例');assert.equal(tool.editor().props.value,' ')
  tool.indent().props.onChange({target:{value:'4'}});await nextTick();await tool.click('清空')
  assert.equal(tool.editor().props.value,'');assert.equal(tool.output(),'');assert.equal(tool.indent().props.value,2);assert.equal(tool.focused(),tool.editor());assert.equal(tool.status(),'')
})
test('C05 successful result copy and failure variants select output', async t => {
  let copied;const tool=mountTool(t,{writeText:async value=>{copied=value}})
  await tool.input(' false ');await tool.click('压缩');await tool.click('复制结果');assert.equal(copied,'false');assert.match(tool.status(),/结果已复制/)
  for (const [clipboard,secure] of [[undefined,true],[{writeText:async()=>{throw new Error('denied')}},true],[{writeText:async()=>{throw new Error('must not run')}},false]]) {
    const failed=mountTool(t,clipboard,secure);await failed.input('null');await failed.click('压缩');await failed.click('复制结果')
    assert.equal(failed.focused(),failed.outputEditor());assert.equal(failed.selected(),failed.outputEditor());assert.match(failed.status(),/手动复制/);assert.equal(failed.editor().props.value,'null')
  }
})
test('C06 stale success/failure never changes new results or focus', async t => {
  for (const mutation of ['clear','edit','indent','recompute']) for (const rejects of [false,true]) {
    let finish;const tool=mountTool(t,{writeText:()=>new Promise((resolve,reject)=>{finish=rejects?()=>reject(new Error('denied')):resolve})})
    await tool.input('{"a":1}');await tool.click('压缩');const pending=tool.button('复制结果').props.onClick();await nextTick()
    if(mutation==='clear') await tool.click('清空')
    else if(mutation==='edit') await tool.input('false')
    else if(mutation==='indent') {tool.indent().props.onChange({target:{value:'4'}});await nextTick()}
    else await tool.click('格式化')
    const previous=tool.status(),output=tool.output(),focus=tool.focused();assert.equal(tool.button('复制中…').props.disabled,true)
    finish();await pending;await nextTick();assert.equal(tool.status(),previous);assert.equal(tool.output(),output);assert.equal(tool.focused(),focus)
  }
})
test('C07 pending prevents duplicate writes and no clipboard reads', async t => {
  let writes=0,finish;const tool=mountTool(t,{writeText:()=>{writes++;return new Promise(resolve=>{finish=resolve})},readText:()=>{throw new Error('must not read')}})
  await tool.input('0');await tool.click('压缩');const pending=tool.button('复制结果').props.onClick();await nextTick();tool.button('复制中…').props.onClick();assert.equal(writes,1);finish();await pending
})
test('C08 unmount ignores late callbacks and remount empty; source text tool unchanged by integration', async t => {
  let fail;const tool=mountTool(t,{writeText:()=>new Promise((_r,reject)=>{fail=reject})})
  await tool.input('true');await tool.click('压缩');const pending=tool.button('复制结果').props.onClick();await nextTick();tool.app.unmount();fail(new Error('late'));await pending
  assert.equal(tool.selected(),false)
  const fresh=mountTool(t);assert.equal(fresh.editor().props.value,'');assert.equal(fresh.output(),'');assert.equal(fresh.indent().props.value,2)
  const home=await readFile(new URL('../src/views/HomeView.vue',import.meta.url),'utf8');assert.match(home,/<TextStatisticsView v-if="toolOpen"/);assert.match(home,/<JsonFormatterView v-if="jsonOpen"/)
})
