// DOM宿主迁移：保留原用例的输入、预期和全部内部循环；jsdom不替代浏览器验收。
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { nextTick } from 'vue'
import Component from '../../src/views/JsonFormatterView.vue'
import { mountDomTool } from '../helpers/domTool'
import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/jsonFormatterInteraction.test.mjs')
const mountTool = (clipboard?: Parameters<typeof mountDomTool>[2], secure = true) => mountDomTool(Component, 'json', clipboard, secure)

test('C01 edit invalidates immediately, illegal and over-limit inputs retained', async () => {
  const tool=mountTool()
  await tool.input('{"a":1}');await tool.click('格式化');assert.ok(tool.output())
  await tool.input('{');assert.equal(tool.output(),'');assert.equal(tool.button('复制结果').disabled,true)
  await tool.click('格式化');assert.match(tool.status(),/语法错误/);assert.equal(tool.editor().value,'{')
  await tool.input('a'.repeat(100001));assert.equal(tool.output(),'');assert.match(tool.status(),/超过/);assert.equal(tool.button('格式化').disabled,true)
})
test('C02 composition prevents execution and never auto-parses', async () => {
  const tool=mountTool();await tool.input('{}');await tool.click('格式化')
  tool.compositionStart();await tool.input('{"a":"你好"}');await nextTick()
  assert.equal(tool.output(),'');assert.equal(tool.button('格式化').disabled,true)
  await tool.click('格式化');await tool.invoke('格式化');assert.equal(tool.output(),'')
  tool.compositionEnd('{"a":"你好"}');await nextTick();assert.equal(tool.output(),'')
  await tool.click('压缩');assert.equal(tool.output(),'{"a":"你好"}')
})
test('C03 indent change, minify independence, validate has no output', async () => {
  const tool=mountTool();await tool.input('{"a":1}');await tool.click('格式化')
  tool.change('4');await nextTick();assert.equal(tool.output(),'')
  await tool.click('格式化');assert.equal(tool.output(),'{\n    "a": 1\n}')
  await tool.click('压缩');assert.equal(tool.output(),'{"a":1}')
  await tool.click('校验语法');assert.equal(tool.output(),'');assert.match(tool.status(),/语法合法/);assert.equal(tool.button('复制结果').disabled,true)
})
test('C04 guarded sample and clear reset/focus', async () => {
  const tool=mountTool();assert.equal(tool.button('清空').disabled,true)
  await tool.click('填入示例');assert.match(tool.editor().value,/WorkDev Tools/);assert.equal(tool.output(),'')
  await tool.input(' ');await tool.click('填入示例');await tool.invoke('填入示例');assert.equal(tool.editor().value,' ')
  tool.change('4');await nextTick();await tool.click('清空')
  assert.equal(tool.editor().value,'');assert.equal(tool.output(),'');assert.equal(tool.indent().value,'2');assert.equal(tool.focused(),tool.editor());assert.equal(tool.status(),'')
})
test('C05 successful result copy and failure variants select output', async () => {
  let copied;const tool=mountTool({writeText:async value=>{copied=value}})
  await tool.input(' false ');await tool.click('压缩');await tool.click('复制结果');assert.equal(copied,'false');assert.match(tool.status(),/结果已复制/)
  for (const [clipboard,secure] of [[undefined,true],[{writeText:async()=>{throw new Error('denied')}},true],[{writeText:async()=>{throw new Error('must not run')}},false]] as const) {
    const failed=mountTool(clipboard,secure);await failed.input('null');await failed.click('压缩');await failed.click('复制结果')
    assert.equal(failed.focused(),failed.outputEditor());assert.equal(failed.selected(),failed.outputEditor());assert.match(failed.status(),/手动复制/);assert.equal(failed.editor().value,'null')
  }
})
test('C06 stale success/failure never changes new results or focus', async () => {
  for (const mutation of ['clear','edit','indent','recompute']) for (const rejects of [false,true]) {
    let finish!: () => void;const tool=mountTool({writeText:()=>new Promise<void>((resolve,reject)=>{finish=rejects?()=>reject(new Error('denied')):resolve})})
    await tool.input('{"a":1}');await tool.click('压缩');const pending=tool.invoke('复制结果');await nextTick()
    if(mutation==='clear') await tool.click('清空')
    else if(mutation==='edit') await tool.input('false')
    else if(mutation==='indent') {tool.change('4');await nextTick()}
    else await tool.click('格式化')
    const previous=tool.status(),output=tool.output(),focus=tool.focused();assert.equal(tool.button('复制中…').disabled,true)
    finish();await pending;await nextTick();assert.equal(tool.status(),previous);assert.equal(tool.output(),output);assert.equal(tool.focused(),focus)
  }
})
test('C07 pending prevents duplicate writes and no clipboard reads', async () => {
  let writes=0;let finish!: () => void;const tool=mountTool({writeText:()=>{writes++;return new Promise<void>(resolve=>{finish=resolve})},readText:()=>{throw new Error('must not read')}})
  await tool.input('0');await tool.click('压缩');const pending=tool.invoke('复制结果');await nextTick();tool.invoke('复制中…');assert.equal(writes,1);finish();await pending
})
test('C08 unmount ignores late callbacks and remount empty; source text tool unchanged by integration', async () => {
  let fail!: (reason: Error) => void;const tool=mountTool({writeText:()=>new Promise<void>((_r,reject)=>{fail=reject})})
  await tool.input('true');await tool.click('压缩');const pending=tool.invoke('复制结果');await nextTick();tool.app.unmount();fail(new Error('late'));await pending
  assert.equal(tool.selected(),false)
  const fresh=mountTool();assert.equal(fresh.editor().value,'');assert.equal(fresh.output(),'');assert.equal(fresh.indent().value,'2')
  for(const c of ['TextStatistics','JsonFormatter']) {
    const page=await readFile(resolve('src/views/pages/'+c+'Page.vue'),'utf8');assert.ok(page.includes('<'+c+'View'))
  }
  const home=await readFile(resolve('src/views/HomeView.vue'),'utf8');assert.ok(!home.includes('v-if="toolOpen"'))
})
