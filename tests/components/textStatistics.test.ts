// DOM宿主迁移：保留原用例的输入、预期和全部内部循环；jsdom不替代浏览器验收。
import assert from 'node:assert/strict'
import { nextTick } from 'vue'
import Component from '../../src/views/TextStatisticsView.vue'
import { mountDomTool } from '../helpers/domTool'
import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/textStatisticsInteraction.test.mjs')
const mountTool = (clipboard?: Parameters<typeof mountDomTool>[2], secure = true) => mountDomTool(Component, 'statistics', clipboard, secure)

test('empty/example/nonempty guard/clear', async () => {
  const tool = mountTool()
  assert.deepEqual(tool.values(), ['0','0','0','0','0'])
  assert.equal(tool.button('清空').disabled, true)
  await tool.click('填入示例')
  await nextTick()
  assert.equal(tool.editor().value, '你好 world\nVue 3')
  assert.equal(tool.button('填入示例').disabled, true)
  await tool.input(' ')
  tool.invoke('填入示例')
  await nextTick()
  assert.equal(tool.editor().value, ' ')
  await tool.click('清空')
  await nextTick()
  assert.deepEqual(tool.values(), ['0','0','0','0','0'])
  assert.equal(tool.focused(), tool.editor())
})
test('composition hides stale numbers until compositionend', async () => {
  const tool = mountTool()
  tool.compositionStart()
  await tool.input('你好')
  assert.deepEqual(tool.values(), ['—','—','—','—','—'])
  assert.match(tool.status(), /输入中/)
  tool.compositionEnd('你好')
  await nextTick()
  assert.deepEqual(tool.values(), ['2','2','1','1','1'])
})
test('over limit preserves text and invalidates results, then recovers', async () => {
  const tool = mountTool()
  await tool.input('a'.repeat(100001))
  assert.equal(tool.editor().value.length, 100001)
  assert.deepEqual(tool.values(), ['—','—','—','—','—'])
  assert.equal(tool.editor().getAttribute('aria-invalid'), 'true')
  await tool.input('abc')
  assert.deepEqual(tool.values(), ['3','3','1','1','1'])
})
test('clipboard missing selects full text even above limit', async () => {
  const tool = mountTool()
  await tool.input('a'.repeat(100001))
  await tool.invoke('复制文本')
  await nextTick()
  assert.equal(tool.selected(), true)
  assert.equal(tool.focused(), tool.editor())
  assert.match(tool.status(), /请选中文本后手动复制/)
  assert.match(tool.status(), /输入超过/)
})
test('clipboard rejection preserves input and shows fallback', async () => {
  const tool = mountTool( { writeText: async () => { throw new Error('denied') } })
  await tool.input(' hello ')
  await tool.invoke('复制文本')
  await nextTick()
  assert.equal(tool.editor().value, ' hello ')
  assert.equal(tool.selected(), true)
  assert.match(tool.status(), /手动复制/)
})
test('clipboard success copies exact text', async () => {
  let copied
  const tool = mountTool( { writeText: async value => { copied = value } })
  await tool.input(' hello\n ')
  await tool.invoke('复制文本')
  await nextTick()
  assert.equal(copied, ' hello\n ')
  assert.match(tool.status(), /文本已复制/)
})
test('pending copy cannot overwrite clear feedback or submit twice', async () => {
  let finish!: () => void
  let calls = 0
  const tool = mountTool( { writeText: () => { calls++; return new Promise<void>(resolve => { finish = resolve }) } })
  await tool.input('abc')
  const copy = () => tool.invoke('复制文本')
  const pending = copy()
  await copy()
  assert.equal(calls, 1)
  await tool.click('清空')
  finish()
  await pending
  await nextTick()
  assert.equal(tool.status(), '文本已清空。')
  assert.equal(tool.editor().value, '')
})
test('unmount during pending clipboard promise is safe', async () => {
  let finish!: () => void
  const tool = mountTool( { writeText: () => new Promise<void>(resolve => { finish = resolve }) })
  await tool.input('abc')
  const pending = tool.invoke('复制文本')
  tool.app.unmount()
  finish()
  await pending
})
