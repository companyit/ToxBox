// DOM宿主迁移：保留原用例的输入、预期和全部内部循环；jsdom不替代浏览器验收。
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { nextTick } from 'vue'
import Component from '../../src/views/UrlEncoderView.vue'
import { mountDomTool } from '../helpers/domTool'
import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/urlEncoderInteraction.test.mjs')
const mountTool = (clipboard?: Parameters<typeof mountDomTool>[2], secure = true) => mountDomTool(Component, 'url', clipboard, secure)

test('C01 default mode, empty state and switching invalidation',async()=>{
 const tool=mountTool();assert.equal(tool.mode().value,'component');for(const action of ['编码','解码']){await tool.click(action);assert.equal(tool.output(),'');assert.equal(tool.status(),'');assert.equal(tool.editor().getAttribute('aria-invalid'),null)}
 await tool.input('/?');await tool.click('编码');assert.equal(tool.output(),'%2F%3F');tool.change('uri');await nextTick();assert.equal(tool.output(),'');assert.equal(tool.button('复制结果').disabled,true);await tool.click('编码');assert.equal(tool.output(),'/?')
})
test('C02 edit, decode failure, excess retention and recovery',async()=>{
 const tool=mountTool();await tool.input('%41');await tool.click('解码');assert.equal(tool.output(),'A');await tool.input('%E4%BD');assert.equal(tool.output(),'');await tool.click('解码');assert.match(tool.status(),/无法解码/);assert.equal(tool.editor().value,'%E4%BD');await tool.input('a'.repeat(100001));assert.equal(tool.output(),'');assert.equal(tool.button('编码').disabled,true);assert.equal(tool.editor().value.length,100001);await tool.input(' ');await tool.click('编码');assert.equal(tool.output(),'%20')
})
test('C03 repeated actions use original input and switching action clears old output',async()=>{
 const tool=mountTool();await tool.input('%252F');await tool.click('解码');assert.equal(tool.output(),'%2F');await tool.click('解码');assert.equal(tool.output(),'%2F');assert.equal(tool.editor().value,'%252F');await tool.input(tool.output());await tool.click('解码');assert.equal(tool.output(),'/');await tool.input('%');await tool.click('编码');assert.equal(tool.output(),'%25');await tool.click('解码');assert.equal(tool.output(),'');assert.match(tool.status(),/无法解码/)
})
test('C04 composition invalidates and requires manual operation',async()=>{
 const tool=mountTool();await tool.input('abc');await tool.click('编码');tool.compositionStart();await tool.input('你好');assert.equal(tool.output(),'');assert.equal(tool.button('编码').disabled,true);assert.equal(tool.mode().disabled,true);await tool.click('编码');await tool.invoke('编码');assert.equal(tool.output(),'');tool.compositionEnd('你好');await nextTick();assert.equal(tool.output(),'');await tool.click('编码');assert.equal(tool.output(),'%E4%BD%A0%E5%A5%BD')
})
test('C05 sample guard, clear and focus reset',async()=>{
 const tool=mountTool();assert.equal(tool.button('清空').disabled,true);tool.change('uri');await nextTick();await tool.click('填入示例');assert.equal(tool.editor().value,'你好 world 😀');assert.equal(tool.output(),'');assert.equal(tool.mode().value,'uri');await tool.input(' ');await tool.click('填入示例');await tool.invoke('填入示例');assert.equal(tool.editor().value,' ');await tool.click('清空');assert.equal(tool.editor().value,'');assert.equal(tool.mode().value,'component');assert.equal(tool.output(),'');assert.equal(tool.status(),'');assert.equal(tool.focused(),tool.editor())
})
test('C06 actual result passed to clipboard, failure variants select output',async()=>{
 let copied;const tool=mountTool({writeText:async value=>{copied=value},readText:()=>{throw Error('must not read')}});await tool.input('%0D%0A');await tool.click('解码');await tool.click('复制结果');assert.equal(copied,'\r\n');assert.match(tool.status(),/结果已复制/)
 for(const [clipboard,secure] of [[undefined,true],[{writeText:async()=>{throw Error('denied')}},true],[{writeText:async()=>{throw Error('must not call')}},false]] as const){const failed=mountTool(clipboard,secure);await failed.input('你好');await failed.click('编码');await failed.click('复制结果');assert.equal(failed.focused(),failed.outputEditor());assert.equal(failed.selected(),failed.outputEditor());assert.match(failed.status(),/手动复制/);assert.equal(failed.editor().value,'你好')}
})
test('C07 duplicate pending copies blocked',async()=>{
 let writes=0;let finish!: () => void;const tool=mountTool({writeText:()=>{writes++;return new Promise<void>(r=>{finish=r})}});await tool.input('a');await tool.click('编码');const pending=tool.invoke('复制结果');await nextTick();tool.invoke('复制中…');assert.equal(writes,1);finish();await pending
})
test('C08 stale completion never changes new result or selection',async()=>{
 for(const mutation of ['edit','mode','clear','recompute'])for(const rejects of [false,true]){let finish!: () => void;const tool=mountTool({writeText:()=>new Promise<void>((resolve,reject)=>{finish=rejects?()=>reject(Error('denied')):resolve})});await tool.input('a b');await tool.click('编码');const pending=tool.invoke('复制结果');await nextTick();if(mutation==='edit')await tool.input('new');else if(mutation==='mode'){tool.change('uri');await nextTick()}else if(mutation==='clear')await tool.click('清空');else await tool.click('解码');const status=tool.status(),output=tool.output(),focus=tool.focused();assert.equal(tool.button('复制中…').disabled,true);finish();await pending;await nextTick();assert.equal(tool.status(),status);assert.equal(tool.output(),output);assert.equal(tool.focused(),focus)}
})
test('C09 unmount, remount, HTML plain value and integration',async()=>{
 let fail!: (reason: Error) => void;const tool=mountTool({writeText:()=>new Promise<void>((_r,j)=>{fail=j})});await tool.input('%3Cscript%3Ealert(1)%3C%2Fscript%3E');await tool.click('解码');assert.equal(tool.output(),'<script>alert(1)</script>');const pending=tool.invoke('复制结果');await nextTick();tool.app.unmount();fail(Error('late'));await pending;assert.equal(tool.selected(),false);const fresh=mountTool();assert.equal(fresh.editor().value,'');assert.equal(fresh.output(),'');assert.equal(fresh.mode().value,'component');for(const c of ['TextStatistics','JsonFormatter','UrlEncoder']){const page=await readFile(resolve('src/views/pages/'+c+'Page.vue'),'utf8');assert.ok(page.includes('<'+c+'View'))}const view=await readFile(resolve('src/views/UrlEncoderView.vue'),'utf8');assert.ok(!view.includes('v-html'))
})
