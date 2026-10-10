// 使用已安装的 Vue 编译器与自定义渲染宿主验证事件逻辑；不替代真实浏览器验收。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import { createRenderer, markRaw, nextTick } from 'vue'

const source = await readFile(new URL('../src/views/UrlEncoderView.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const compiled = compileScript(descriptor, { id: 'url-encoder-test', inlineTemplate: true })
const script = ts.transpileModule(compiled.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replaceAll('"vue"', JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'vue'", JSON.stringify(import.meta.resolve('vue')))
  .replaceAll("'@/utils/urlEncoder'", JSON.stringify(new URL('../src/utils/urlEncoder.ts', import.meta.url).href))
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
  const editor = () => descendants().find(n => n.props.id === 'url-input')
  const button = label => descendants().find(n => n.tag === 'button' && content(n) === label)
  const status = () => content(descendants().find(n => n.props.id === 'url-status'))
  const outputEditor = () => descendants().find(n => n.props.id === 'url-output')
  const output = () => outputEditor().props.value
  const mode = () => descendants().find(n => n.tag === 'select')
  const click = async label => { await button(label).props.onClick(); await nextTick() }
  const input = async value => { editor().props.onInput({ target: { value } }); await nextTick() }
  t.after(() => {
    app.unmount()
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
    else delete globalThis.navigator
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else delete globalThis.window
  })
  return { app, editor, outputEditor, output, mode, click, button, status, input, focused: () => focused, selected: () => selected }
}

test('C01 default mode, empty state and switching invalidation',async t=>{
 const tool=mountTool(t);assert.equal(tool.mode().props.value,'component');for(const action of ['编码','解码']){await tool.click(action);assert.equal(tool.output(),'');assert.equal(tool.status(),'');assert.equal(tool.editor().props['aria-invalid'],undefined)}
 await tool.input('/?');await tool.click('编码');assert.equal(tool.output(),'%2F%3F');tool.mode().props.onChange({target:{value:'uri'}});await nextTick();assert.equal(tool.output(),'');assert.equal(tool.button('复制结果').props.disabled,true);await tool.click('编码');assert.equal(tool.output(),'/?')
})
test('C02 edit, decode failure, excess retention and recovery',async t=>{
 const tool=mountTool(t);await tool.input('%41');await tool.click('解码');assert.equal(tool.output(),'A');await tool.input('%E4%BD');assert.equal(tool.output(),'');await tool.click('解码');assert.match(tool.status(),/无法解码/);assert.equal(tool.editor().props.value,'%E4%BD');await tool.input('a'.repeat(100001));assert.equal(tool.output(),'');assert.equal(tool.button('编码').props.disabled,true);assert.equal(tool.editor().props.value.length,100001);await tool.input(' ');await tool.click('编码');assert.equal(tool.output(),'%20')
})
test('C03 repeated actions use original input and switching action clears old output',async t=>{
 const tool=mountTool(t);await tool.input('%252F');await tool.click('解码');assert.equal(tool.output(),'%2F');await tool.click('解码');assert.equal(tool.output(),'%2F');assert.equal(tool.editor().props.value,'%252F');await tool.input(tool.output());await tool.click('解码');assert.equal(tool.output(),'/');await tool.input('%');await tool.click('编码');assert.equal(tool.output(),'%25');await tool.click('解码');assert.equal(tool.output(),'');assert.match(tool.status(),/无法解码/)
})
test('C04 composition invalidates and requires manual operation',async t=>{
 const tool=mountTool(t);await tool.input('abc');await tool.click('编码');tool.editor().props.onCompositionstart();await tool.input('你好');assert.equal(tool.output(),'');assert.equal(tool.button('编码').props.disabled,true);assert.equal(tool.mode().props.disabled,true);await tool.click('编码');assert.equal(tool.output(),'');tool.editor().props.onCompositionend({target:{value:'你好'}});await nextTick();assert.equal(tool.output(),'');await tool.click('编码');assert.equal(tool.output(),'%E4%BD%A0%E5%A5%BD')
})
test('C05 sample guard, clear and focus reset',async t=>{
 const tool=mountTool(t);assert.equal(tool.button('清空').props.disabled,true);tool.mode().props.onChange({target:{value:'uri'}});await nextTick();await tool.click('填入示例');assert.equal(tool.editor().props.value,'你好 world 😀');assert.equal(tool.output(),'');assert.equal(tool.mode().props.value,'uri');await tool.input(' ');await tool.click('填入示例');assert.equal(tool.editor().props.value,' ');await tool.click('清空');assert.equal(tool.editor().props.value,'');assert.equal(tool.mode().props.value,'component');assert.equal(tool.output(),'');assert.equal(tool.status(),'');assert.equal(tool.focused(),tool.editor())
})
test('C06 actual result passed to clipboard, failure variants select output',async t=>{
 let copied;const tool=mountTool(t,{writeText:async value=>{copied=value},readText:()=>{throw Error('must not read')}});await tool.input('%0D%0A');await tool.click('解码');await tool.click('复制结果');assert.equal(copied,'\r\n');assert.match(tool.status(),/结果已复制/)
 for(const [clipboard,secure] of [[undefined,true],[{writeText:async()=>{throw Error('denied')}},true],[{writeText:async()=>{throw Error('must not call')}},false]]){const failed=mountTool(t,clipboard,secure);await failed.input('你好');await failed.click('编码');await failed.click('复制结果');assert.equal(failed.focused(),failed.outputEditor());assert.equal(failed.selected(),failed.outputEditor());assert.match(failed.status(),/手动复制/);assert.equal(failed.editor().props.value,'你好')}
})
test('C07 duplicate pending copies blocked',async t=>{
 let writes=0,finish;const tool=mountTool(t,{writeText:()=>{writes++;return new Promise(r=>{finish=r})}});await tool.input('a');await tool.click('编码');const pending=tool.button('复制结果').props.onClick();await nextTick();tool.button('复制中…').props.onClick();assert.equal(writes,1);finish();await pending
})
test('C08 stale completion never changes new result or selection',async t=>{
 for(const mutation of ['edit','mode','clear','recompute'])for(const rejects of [false,true]){let finish;const tool=mountTool(t,{writeText:()=>new Promise((resolve,reject)=>{finish=rejects?()=>reject(Error('denied')):resolve})});await tool.input('a b');await tool.click('编码');const pending=tool.button('复制结果').props.onClick();await nextTick();if(mutation==='edit')await tool.input('new');else if(mutation==='mode'){tool.mode().props.onChange({target:{value:'uri'}});await nextTick()}else if(mutation==='clear')await tool.click('清空');else await tool.click('解码');const status=tool.status(),output=tool.output(),focus=tool.focused();assert.equal(tool.button('复制中…').props.disabled,true);finish();await pending;await nextTick();assert.equal(tool.status(),status);assert.equal(tool.output(),output);assert.equal(tool.focused(),focus)}
})
test('C09 unmount, remount, HTML plain value and integration',async t=>{
 let fail;const tool=mountTool(t,{writeText:()=>new Promise((_r,j)=>{fail=j})});await tool.input('%3Cscript%3Ealert(1)%3C%2Fscript%3E');await tool.click('解码');assert.equal(tool.output(),'<script>alert(1)</script>');const pending=tool.button('复制结果').props.onClick();await nextTick();tool.app.unmount();fail(Error('late'));await pending;assert.equal(tool.selected(),false);const fresh=mountTool(t);assert.equal(fresh.editor().props.value,'');assert.equal(fresh.output(),'');assert.equal(fresh.mode().props.value,'component');for(const c of ['TextStatistics','JsonFormatter','UrlEncoder']){const page=await readFile(new URL('../src/views/pages/'+c+'Page.vue',import.meta.url),'utf8');assert.ok(page.includes('<'+c+'View'))}const view=await readFile(new URL('../src/views/UrlEncoderView.vue',import.meta.url),'utf8');assert.ok(!view.includes('v-html'))
})
