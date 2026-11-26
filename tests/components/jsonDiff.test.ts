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
const originalScroll=Object.getOwnPropertyDescriptor(Element.prototype,'scrollIntoView')
let w:ReturnType<typeof mount>|undefined
function setup(){Object.defineProperty(Element.prototype,'scrollIntoView',{configurable:true,value:vi.fn()});vi.stubGlobal('Worker',FakeWorker);w=mount(JsonDiffPage,{attachTo:document.body,global:{provide:{[interactionReadyKey as symbol]:ref(true)},stubs:{RouterLink:{template:'<a><slot /></a>'}}}});return w}
const button=(wrapper:ReturnType<typeof setup>,text:string)=>wrapper.findAll('button').find(x=>x.text()===text)!
async function input(wrapper:ReturnType<typeof setup>,a:string,b:string){await wrapper.findAll('textarea')[0]!.setValue(a);await wrapper.findAll('textarea')[1]!.setValue(b)}
async function run(wrapper:ReturnType<typeof setup>,a:string,b:string){await input(wrapper,a,b);await button(wrapper,'对比 JSON 结构').trigger('click');FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareJson(a,b)}});await nextTick()}
afterEach(()=>{w?.unmount();w=undefined;FakeWorker.all=[];vi.unstubAllGlobals();vi.useRealTimers();if(originalScroll)Object.defineProperty(Element.prototype,'scrollIntoView',originalScroll);else delete (Element.prototype as any).scrollIntoView})
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

async function choose(wrapper:ReturnType<typeof setup>,side:'before'|'after',name='test.json',size=10){
 const control=wrapper.get('#json-file-'+side)
 Object.defineProperty(control.element,'files',{configurable:true,value:[{name,size}]})
 await control.trigger('change')
 return FakeWorker.all.at(-1)!
}
test('双方独立读取原文不自动对比，成功替换单侧，来源交换及手动编辑清理',async()=>{
 const wrapper=setup();await input(wrapper,'{"old":1}','{"keep":2}')
 const original=await choose(wrapper,'before','before.JSON'),next=await choose(wrapper,'after','after.json')
 expect(button(wrapper,'对比 JSON 结构').attributes('disabled')).toBeDefined()
 expect(button(wrapper,'交换 JSON').attributes('disabled')).toBeDefined()
 original.onmessage!({data:{ok:true,text:'{\r\n"id":9007199254740993\n}'}});await nextTick()
 expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','{\n"id":9007199254740993\n}')
 expect(wrapper.findAll('textarea')[1]!.element).toHaveProperty('value','{"keep":2}')
 expect(next.terminate).not.toHaveBeenCalled()
 next.onmessage!({data:{ok:true,text:'{"id":9007199254740994}'}});await nextTick()
 expect(wrapper.find('.results').exists()).toBe(false);expect(FakeWorker.all).toHaveLength(2)
 await button(wrapper,'对比 JSON 结构').trigger('click')
 expect(FakeWorker.all.at(-1)!.postMessage).toHaveBeenCalledWith({before:'{\r\n"id":9007199254740993\n}',after:'{"id":9007199254740994}'})
 FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareJson('{"id":9007199254740993}','{"id":9007199254740994}')}});await nextTick()
 await button(wrapper,'交换 JSON').trigger('click')
 expect(wrapper.findAll('.file-source')[0]!.text()).toContain('after.json')
 await wrapper.findAll('textarea')[0]!.setValue('{}');expect(wrapper.findAll('.file-source')).toHaveLength(1)
})
test('选择或读取失败保留旧输入且废弃旧比较，重选/编辑阻止迟到覆盖',async()=>{
 const wrapper=setup();await run(wrapper,'{"a":1}','{"a":2}')
 const count=FakeWorker.all.length
 await choose(wrapper,'before','PRIVATE.exe')
 expect(FakeWorker.all).toHaveLength(count);expect(wrapper.find('.results').exists()).toBe(false)
 expect(wrapper.get('#json-file-status-before').text()).not.toContain('PRIVATE')
 expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','{"a":1}')
 await choose(wrapper,'before','big.json',400001);expect(FakeWorker.all).toHaveLength(count)
 const first=await choose(wrapper,'before'),second=await choose(wrapper,'before')
 expect(first.terminate).toHaveBeenCalled()
 first.onmessage!({data:{ok:true,text:'STALE'}});await nextTick()
 expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','{"a":1}')
 second.onmessage!({data:{ok:false,code:'encoding'}});await nextTick()
 expect(wrapper.get('#json-file-status-before').text()).toContain('UTF-8')
 const edited=await choose(wrapper,'before');await wrapper.findAll('textarea')[0]!.setValue('{"manual":true}')
 edited.onmessage!({data:{ok:true,text:'STALE'}});await nextTick()
 expect(edited.terminate).toHaveBeenCalled();expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','{"manual":true}')
 expect(wrapper.find('.file-source').exists()).toBe(false)
})
test('读取取消/超时/运行时失败可重试，输入保持，IME与pagehide停止读取',async()=>{
 vi.useFakeTimers();const wrapper=setup();await input(wrapper,'{}','[]')
 const canceled=await choose(wrapper,'before');await button(wrapper,'取消原文件读取').trigger('click')
 canceled.onmessage!({data:{ok:true,text:'STALE'}});await nextTick()
 expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','{}')
 const timed=await choose(wrapper,'before');await vi.advanceTimersByTimeAsync(10000)
 expect(timed.terminate).toHaveBeenCalled();expect(wrapper.get('#json-file-status-before').text()).toContain('10 秒')
 const failed=await choose(wrapper,'after');failed.onerror!();await nextTick()
 expect(wrapper.get('#json-file-status-after').text()).toContain('当前输入已保留')
 const ime=await choose(wrapper,'before');await wrapper.findAll('textarea')[0]!.trigger('compositionstart')
 expect(ime.terminate).toHaveBeenCalled();expect(button(wrapper,'导入原 JSON 文件').attributes('disabled')).toBeDefined()
 await wrapper.findAll('textarea')[0]!.trigger('compositionend')
 const left=await choose(wrapper,'before'),right=await choose(wrapper,'after')
 window.dispatchEvent(new Event('pagehide'));await nextTick()
 for(const reader of [left,right]){expect(reader.terminate).toHaveBeenCalled();reader.onmessage!({data:{ok:true,text:'STALE'}})}
 await nextTick();expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','')
 expect(wrapper.findAll('textarea')[1]!.element).toHaveProperty('value','')
 expect(wrapper.find('.file-source').exists()).toBe(false)
})


test('开始导入废弃待定比较，清空与卸载停止读取及迟到响应',async()=>{
 const wrapper=setup();await input(wrapper,'{}','{}');await button(wrapper,'对比 JSON 结构').trigger('click')
 const compare=FakeWorker.all.at(-1)!,read=await choose(wrapper,'before')
 expect(compare.terminate).toHaveBeenCalled()
 compare.onmessage!({data:{ok:true,result:compareJson('{}','{}')}});await nextTick()
 expect(wrapper.find('.results').exists()).toBe(false)
 await button(wrapper,'清空').trigger('click');expect(read.terminate).toHaveBeenCalled()
 read.onmessage!({data:{ok:true,text:'STALE'}});await nextTick()
 expect(wrapper.findAll('textarea')[0]!.element).toHaveProperty('value','')
 const unmounted=await choose(wrapper,'after');wrapper.unmount();w=undefined
 expect(unmounted.terminate).toHaveBeenCalled()
 unmounted.onmessage!({data:{ok:true,text:'STALE'}})
})


test('路径定位跨100项页，高亮/焦点唯一，报告仍覆盖所有类型结果',async()=>{
 const wrapper=setup();await run(wrapper,JSON.stringify(Array(205).fill(0)),JSON.stringify(Array(205).fill(1)))
 await button(wrapper,'查看完整报告').trigger('click')
 await wrapper.get('#json-path-search').setValue('/10')
 expect(wrapper.get('#json-navigation-status').text()).toContain('找到 11 处')
 expect(wrapper.findAll('.change-list li')).toHaveLength(100)
 expect((wrapper.get('#json-diff-report').element as HTMLTextAreaElement).value).toContain('路径 "/204"')
 await button(wrapper,'定位首处').trigger('click')
 expect(wrapper.get('.change-list [aria-current="true"]').attributes('data-change-index')).toBe('10')
 expect(document.activeElement).toBe(wrapper.get('.change-list [aria-current="true"]').element)
 await button(wrapper,'下一处差异').trigger('click')
 expect(wrapper.get('.pagination').text()).toContain('第 2 / 3 页')
 expect(wrapper.findAll('.change-list [aria-current="true"]')).toHaveLength(1)
 expect(wrapper.get('.change-list [aria-current="true"]').attributes('data-change-index')).toBe('100')
 expect(wrapper.get('#json-navigation-status').text()).toContain('当前第 2 / 11 处')
 await button(wrapper,'上一处差异').trigger('click')
 expect(wrapper.get('.pagination').text()).toContain('第 1 / 3 页')
 expect(button(wrapper,'上一处差异').attributes('disabled')).toBeDefined()
})
test('根路径/单匹配及零匹配边界准确，下一处从未定位进入首项',async()=>{
 const wrapper=setup();await run(wrapper,'1','2')
 await button(wrapper,'下一处差异').trigger('click')
 expect(wrapper.get('.change-list [aria-current="true"]').attributes('data-change-index')).toBe('0')
 expect(button(wrapper,'下一处差异').attributes('disabled')).toBeDefined()
 expect(button(wrapper,'上一处差异').attributes('disabled')).toBeDefined()
 await wrapper.get('#json-path-search').setValue('PRIVATE_MISSING')
 expect(wrapper.get('#json-navigation-status').text()).toBe('没有匹配的差异路径。')
 expect(wrapper.findAll('.change-list li')).toHaveLength(1)
 for(const name of ['定位首处','上一处差异','下一处差异'])expect(button(wrapper,name).attributes('disabled')).toBeDefined()
 await wrapper.get('#json-diff-filter').setValue('add')
 expect(wrapper.find('.change-list').exists()).toBe(false)
})
test('手动翻页及类型筛选撤销定位但保留查找，编辑清空查询和结果',async()=>{
 const wrapper=setup();await run(wrapper,JSON.stringify(Array(205).fill(0)),JSON.stringify(Array(205).fill(1)))
 await wrapper.get('#json-path-search').setValue('/10');await button(wrapper,'定位首处').trigger('click')
 await button(wrapper,'下一页').trigger('click')
 expect(wrapper.find('.change-list [aria-current="true"]').exists()).toBe(false)
 expect(wrapper.get('#json-path-search').element).toHaveProperty('value','/10')
 await wrapper.get('#json-diff-filter').setValue('change')
 expect(wrapper.get('.pagination').text()).toContain('第 1 / 3 页')
 expect(wrapper.get('#json-navigation-status').text()).toContain('尚未定位')
 await button(wrapper,'定位首处').trigger('click')
 await wrapper.findAll('textarea')[0]!.setValue('{}')
 expect(wrapper.find('.results').exists()).toBe(false)
 await run(wrapper,'{}','{"a":1}')
 expect(wrapper.get('#json-path-search').element).toHaveProperty('value','')
})
test('查找IME只暂停定位，保留比较结果；结束后提交并可用Enter定位',async()=>{
 const wrapper=setup();await run(wrapper,'{"名字":1,"id":1}','{"名字":2,"id":2}')
 const search=wrapper.get('#json-path-search')
 await search.trigger('compositionstart')
 ;(search.element as HTMLInputElement).value='名字';await search.trigger('input')
 expect(wrapper.findAll('.change-list li')).toHaveLength(2)
 expect(button(wrapper,'定位首处').attributes('disabled')).toBeDefined()
 expect(wrapper.get('#json-navigation-status').text()).toContain('正在输入')
 await search.trigger('keydown',{key:'Enter'});expect(wrapper.find('[aria-current="true"]').exists()).toBe(false)
 await search.trigger('compositionend')
 expect(wrapper.get('#json-navigation-status').text()).toContain('找到 1 处')
 const candidate=new KeyboardEvent('keydown',{key:'Enter',isComposing:true,cancelable:true,bubbles:true})
 search.element.dispatchEvent(candidate);await nextTick()
 expect(candidate.defaultPrevented).toBe(false);expect(wrapper.find('.change-list [aria-current="true"]').exists()).toBe(false)
 await search.trigger('keydown',{key:'Enter'})
 expect(wrapper.get('.change-list [aria-current="true"] .change-path').text()).toBe('/名字')
})
test('输入新查找或离页使等待DOM的定位失效，不抢焦点',async()=>{
 const wrapper=setup();await run(wrapper,'{"a":1}','{"a":2}')
 const search=wrapper.get('#json-path-search');(search.element as HTMLInputElement).focus()
 ;(button(wrapper,'定位首处').element as HTMLButtonElement).click()
 ;(search.element as HTMLInputElement).value='none';search.element.dispatchEvent(new Event('input',{bubbles:true}))
 await nextTick();expect(document.activeElement).toBe(search.element)
 expect(wrapper.find('.change-list [aria-current="true"]').exists()).toBe(false)
 await search.setValue('');(button(wrapper,'定位首处').element as HTMLButtonElement).click()
 window.dispatchEvent(new Event('pagehide'));await nextTick()
 expect(wrapper.find('.results').exists()).toBe(false)
})
