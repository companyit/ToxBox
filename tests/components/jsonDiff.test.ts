import { afterEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import JsonDiffPage from '../../src/views/pages/JsonDiffPage.vue'
import { interactionReadyKey } from '../../src/interactionReady'
import { compareJson } from '../../src/utils/jsonDiff'
class FakeWorker {
 static all:FakeWorker[]=[]
 onmessage:((event:{data:any})=>void)|null=null
 onerror:(()=>void)|null=null
 postMessage=vi.fn();terminate=vi.fn()
 constructor(){FakeWorker.all.push(this)}
}
let w:ReturnType<typeof mount>|undefined
function setup(){vi.stubGlobal('Worker',FakeWorker);w=mount(JsonDiffPage,{attachTo:document.body,global:{provide:{[interactionReadyKey as symbol]:ref(true)},stubs:{RouterLink:{template:'<a><slot /></a>'}}}});return w}
const button=(wrapper:ReturnType<typeof setup>,text:string)=>wrapper.findAll('button').find(x=>x.text()===text)!
async function input(wrapper:ReturnType<typeof setup>,a:string,b:string){await wrapper.findAll('textarea')[0]!.setValue(a);await wrapper.findAll('textarea')[1]!.setValue(b)}
async function run(wrapper:ReturnType<typeof setup>,a:string,b:string){await input(wrapper,a,b);await button(wrapper,'对比 JSON 结构').trigger('click');FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareJson(a,b)}});await nextTick()}
afterEach(()=>{w?.unmount();w=undefined;FakeWorker.all=[];vi.unstubAllGlobals();vi.useRealTimers()})
test('示例不覆盖任一输入，原文保留且编辑撤销结果/报告，清空回焦',async()=>{
 const wrapper=setup();await input(wrapper,'','{}');await button(wrapper,'填入示例').trigger('click')
 expect(wrapper.get('#json-diff-status').text()).toContain('请先清空')
 expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','')
 await button(wrapper,'清空').trigger('click');await button(wrapper,'填入示例').trigger('click')
 await button(wrapper,'对比 JSON 结构').trigger('click')
 const values=wrapper.findAll('textarea').map(x=>(x.element as HTMLTextAreaElement).value)
 FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareJson(values[0]!,values[1]!)}});await nextTick()
 expect(wrapper.get('.summary').text()).toContain('修改 4 项')
 await button(wrapper,'查看完整报告').trigger('click');expect(wrapper.find('#json-diff-report').exists()).toBe(true)
 await wrapper.findAll('textarea')[0]!.setValue('{}');expect(wrapper.find('.results').exists()).toBe(false)
 await button(wrapper,'清空').trigger('click');expect(document.activeElement).toBe(wrapper.findAll('textarea')[0]!.element)
})
test('错误侧别和位置准确、不回显原文；组合输入禁止执行并废弃迟到消息',async()=>{
 const wrapper=setup();await input(wrapper,'{}','PRIVATE')
 await button(wrapper,'对比 JSON 结构').trigger('click');const previous=FakeWorker.all.at(-1)!
 previous.onmessage!({data:{ok:false,code:'invalid-json',side:'after',line:1,column:1}});await nextTick()
 expect(wrapper.get('#json-diff-status').text()).toContain('新 JSON：第 1 行')
 expect(wrapper.get('#json-diff-status').text()).not.toContain('PRIVATE')
 expect(wrapper.findAll('textarea')[1]!.attributes('aria-invalid')).toBe('true')
 await input(wrapper,'{}','{}');await button(wrapper,'对比 JSON 结构').trigger('click');const canceled=FakeWorker.all.at(-1)!
 await wrapper.findAll('textarea')[0]!.trigger('compositionstart')
 expect(canceled.terminate).toHaveBeenCalled();expect(button(wrapper,'对比 JSON 结构').attributes()).toHaveProperty('disabled')
 canceled.onmessage!({data:{ok:true,result:compareJson('{}','{}')}});await nextTick();expect(wrapper.find('.results').exists()).toBe(false)
 await wrapper.findAll('textarea')[0]!.trigger('compositionend');await button(wrapper,'对比 JSON 结构').trigger('click')
 FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareJson('{}','{}')}});await nextTick();expect(wrapper.get('#json-diff-status').text()).toContain('相同')
})
test('100项分页、全局统计、筛选重置及完整报告覆盖所有筛选结果',async()=>{
 const wrapper=setup(),a=JSON.stringify(Array(205).fill(0)),b=JSON.stringify(Array(205).fill(1))
 await run(wrapper,a,b);expect(wrapper.findAll('.change-list li')).toHaveLength(100)
 expect(wrapper.find('#json-diff-report').exists()).toBe(false)
 await button(wrapper,'下一页').trigger('click');await button(wrapper,'下一页').trigger('click')
 expect(wrapper.findAll('.change-list li')).toHaveLength(5);expect(wrapper.get('.change-path').text()).toBe('/200')
 await button(wrapper,'查看完整报告').trigger('click')
 expect((wrapper.get('#json-diff-report').element as HTMLTextAreaElement).value).toContain('路径 "/204"')
 expect((wrapper.get('#json-diff-report').element as HTMLTextAreaElement).value).toContain('路径 "/0"')
 await wrapper.get('#json-diff-filter').setValue('add');expect(wrapper.find('#json-diff-report').exists()).toBe(false)
 expect(wrapper.get('.summary').text()).toContain('修改 205 项')
 await wrapper.get('#json-diff-filter').setValue('all');expect(wrapper.get('.pagination').text()).toContain('第 1 / 3 页')
})
test('取消/超时可重试，pagehide与卸载清空全部内容',async()=>{
 vi.useFakeTimers();const wrapper=setup();await input(wrapper,'{}','{}');await button(wrapper,'对比 JSON 结构').trigger('click')
 const canceled=FakeWorker.all.at(-1)!;await button(wrapper,'取消对比').trigger('click');expect(canceled.terminate).toHaveBeenCalled()
 await button(wrapper,'对比 JSON 结构').trigger('click');const timed=FakeWorker.all.at(-1)!
 await vi.advanceTimersByTimeAsync(10000);expect(timed.terminate).toHaveBeenCalled();expect(wrapper.get('#json-diff-status').text()).toContain('10 秒')
 await button(wrapper,'对比 JSON 结构').trigger('click');const late=FakeWorker.all.at(-1)!
 window.dispatchEvent(new Event('pagehide'));await nextTick();late.onmessage!({data:{ok:true,result:compareJson('{}','{}')}});await nextTick()
 expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','');expect(wrapper.find('.results').exists()).toBe(false)
})
test('复制失败选中完整报告，换筛选/编辑阻止迟到复制反馈',async()=>{
 const wrapper=setup();await run(wrapper,'{"a":1}','{"a":2}')
 vi.stubGlobal('isSecureContext',false);await button(wrapper,'复制结构对比报告').trigger('click');await nextTick()
 expect(wrapper.get('#json-diff-status').text()).toContain('手动复制')
 const report=wrapper.get('#json-diff-report').element as HTMLTextAreaElement
 expect(document.activeElement).toBe(report);expect(report.selectionEnd).toBe(report.value.length)
 let resolve!:()=>void;vi.stubGlobal('isSecureContext',true)
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise<void>(done=>{resolve=done})}})
 await button(wrapper,'复制结构对比报告').trigger('click');await wrapper.get('#json-diff-filter').setValue('add');resolve();await flushPromises()
 expect(wrapper.get('#json-diff-status').text()).not.toContain('已复制');expect(wrapper.find('#json-diff-report').exists()).toBe(false)
})
