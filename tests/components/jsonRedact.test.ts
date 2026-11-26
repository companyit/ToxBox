import {afterEach,expect,test,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {nextTick,ref} from 'vue'
import JsonRedactPage from '../../src/views/pages/JsonRedactPage.vue'
import {interactionReadyKey} from '../../src/interactionReady'
import {redactJson} from '../../src/utils/jsonRedact'
class FakeWorker{static all:FakeWorker[]=[];onmessage:((event:{data:any})=>void)|null=null;onerror:(()=>void)|null=null;postMessage=vi.fn();terminate=vi.fn();constructor(){FakeWorker.all.push(this)}}
let w:ReturnType<typeof mount>|undefined
function setup(){vi.stubGlobal('Worker',FakeWorker);w=mount(JsonRedactPage,{attachTo:document.body,global:{provide:{[interactionReadyKey as symbol]:ref(true)},stubs:{RouterLink:{template:'<a><slot /></a>'}}}});return w}
const button=(wrapper:ReturnType<typeof setup>,text:string)=>wrapper.findAll('button').find(x=>x.text()===text)!
async function done(wrapper:ReturnType<typeof setup>){await button(wrapper,'执行字段脱敏').trigger('click');const source=(wrapper.get('#redact-source').element as HTMLTextAreaElement).value,paths=(wrapper.get('#redact-paths').element as HTMLTextAreaElement).value,replacement=(wrapper.get('#redact-replacement').element as HTMLInputElement).value;FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,...redactJson(source,paths,replacement)}});await nextTick()}
afterEach(()=>{w?.unmount();w=undefined;FakeWorker.all=[];vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers()})
test('示例/执行/编辑失效与清空回焦，错误保留原文且不回显字段',async()=>{
 const wrapper=setup();await button(wrapper,'填入示例').trigger('click');await done(wrapper)
 expect(wrapper.get('#redact-result').element).toHaveProperty('value',expect.stringContaining('9007199254740993'))
 expect(wrapper.get('#redact-status').text()).toContain('已替换 2 个目标')
 await wrapper.get('#redact-paths').setValue('["/PRIVATE"]');expect(wrapper.get('#redact-result').element).toHaveProperty('value','')
 await button(wrapper,'执行字段脱敏').trigger('click');FakeWorker.all.at(-1)!.onmessage!({data:{ok:false,code:'path',field:'paths',item:1}});await nextTick()
 expect(wrapper.get('#redact-status').text()).not.toContain('PRIVATE');expect(wrapper.get('#redact-paths').attributes('aria-invalid')).toBe('true')
 const source=(wrapper.get('#redact-source').element as HTMLTextAreaElement).value
 await button(wrapper,'填入示例').trigger('click');expect(wrapper.get('#redact-status').text()).toContain('请先清空')
 expect(wrapper.get('#redact-source').element).toHaveProperty('value',source)
 await button(wrapper,'清空').trigger('click');expect(document.activeElement).toBe(wrapper.get('#redact-source').element);expect(wrapper.get('#redact-paths').element).toHaveProperty('value','[]')
})
test('取消、超时、IME与离页清理使迟到Worker响应无效',async()=>{
 vi.useFakeTimers();const wrapper=setup();await button(wrapper,'填入示例').trigger('click')
 await button(wrapper,'执行字段脱敏').trigger('click');const canceled=FakeWorker.all.at(-1)!;await button(wrapper,'取消处理').trigger('click')
 expect(canceled.terminate).toHaveBeenCalled();canceled.onmessage!({data:{ok:true,output:'STALE',count:1}});await nextTick();expect(wrapper.get('#redact-result').element).toHaveProperty('value','')
 await button(wrapper,'执行字段脱敏').trigger('click');await vi.advanceTimersByTimeAsync(10000);expect(wrapper.get('#redact-status').text()).toContain('10 秒')
 await wrapper.get('#redact-source').trigger('compositionstart');for(const b of wrapper.findAll('button'))expect(b.attributes('disabled')).toBeDefined()
 await wrapper.get('#redact-source').trigger('compositionend');await button(wrapper,'执行字段脱敏').trigger('click');const late=FakeWorker.all.at(-1)!
 window.dispatchEvent(new Event('pagehide'));await nextTick();late.onmessage!({data:{ok:true,output:'STALE',count:1}});await nextTick()
 expect(late.terminate).toHaveBeenCalled();expect(wrapper.get('#redact-source').element).toHaveProperty('value','');expect(wrapper.get('#redact-result').element).toHaveProperty('value','')
})
test('复制失败选中结果，编辑拒绝迟到反馈，下载URL按需复用且离页回收',async()=>{
 const create=vi.fn((_blob:Blob)=>'blob:redacted'),revoke=vi.fn();vi.stubGlobal('URL',class extends URL{static createObjectURL=create;static revokeObjectURL=revoke})
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 const wrapper=setup();await button(wrapper,'填入示例').trigger('click');await done(wrapper)
 vi.stubGlobal('isSecureContext',false);await button(wrapper,'复制脱敏结果').trigger('click');expect(wrapper.get('#redact-status').text()).toContain('手动复制');expect(document.activeElement).toBe(wrapper.get('#redact-result').element)
 let resolve!:()=>void;vi.stubGlobal('isSecureContext',true);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise<void>(done=>{resolve=done})}})
 await button(wrapper,'复制脱敏结果').trigger('click');await wrapper.get('#redact-replacement').setValue('MASK');resolve();await flushPromises();expect(wrapper.get('#redact-status').text()).toBe('')
 await done(wrapper);expect(create).not.toHaveBeenCalled();await button(wrapper,'下载脱敏 JSON').trigger('click');await button(wrapper,'下载脱敏 JSON').trigger('click')
 expect(create).toHaveBeenCalledTimes(1);expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('redacted.json');expect(create.mock.calls[0]![0].type).toBe('application/json;charset=utf-8');expect(document.querySelector('a[download]')).toBeNull()
 window.dispatchEvent(new Event('pagehide'));await nextTick();expect(revoke).toHaveBeenCalledTimes(1)
})
