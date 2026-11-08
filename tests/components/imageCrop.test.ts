import { mount } from '@vue/test-utils'
import { beforeEach, afterEach, test, expect, vi } from 'vitest'
import Page from '../../src/views/pages/ImageCropPage.vue'
const workers: FakeWorker[] = [], wrappers: ReturnType<typeof mount>[] = []
class FakeWorker { onmessage?: (event:{data:unknown})=>void;onerror?:()=>void;terminate=vi.fn();postMessage=vi.fn();constructor(){workers.push(this)} }
beforeEach(()=>{workers.length=0;vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker);vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:crop');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{})})
afterEach(()=>{for(const w of wrappers)w.unmount();wrappers.length=0;vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
function setup(){const w=mount(Page,{attachTo:document.body,global:{stubs:{ToolPageLayout:{template:'<div><slot /></div>'}}}});wrappers.push(w);return w}
async function select(w:ReturnType<typeof mount>){Object.defineProperty(w.get('#crop-file').element,'files',{configurable:true,value:[new File(['data'],'PRIVATE.png')]});await w.get('#crop-file').trigger('change')}
async function respond(w:ReturnType<typeof mount>){workers.at(-1)!.onmessage!({data:{ok:true,image:{width:400,height:300},output:{width:400,height:300},blob:new Blob(['image'])}});await w.vm.$nextTick()}
function action(w:ReturnType<typeof mount>,name:string){return w.findAll('button').find(b=>b.text()===name)!}
test('无效草稿禁止旧框生成、尺寸变更撤销结果、输入法保护',async()=>{
 const w=setup();await select(w);await respond(w)
 await action(w,'生成裁剪图片').trigger('click');await respond(w);expect(w.find('a[download]').exists()).toBe(true)
 const width=w.findAll('input[type=number]')[2]!
 await width.setValue('');expect(w.get('[role=alert]').text()).toContain('先修正');expect(action(w,'生成裁剪图片').attributes()).toHaveProperty('disabled');expect(w.find('a[download]').exists()).toBe(false)
 expect(width.element).toHaveProperty('value','')
 await width.setValue('200');await width.trigger('compositionstart');const count=workers.length;await action(w,'生成裁剪图片').trigger('click');expect(workers.length).toBe(count);await width.trigger('compositionend')
 await action(w,'生成裁剪图片').trigger('click');await respond(w);await w.findAll('input[type=number]')[4]!.setValue('100');expect(w.find('a[download]').exists()).toBe(false)
})
test('取消、超时、重选和离页隔离迟到消息并释放URL',async()=>{
 const w=setup();await select(w);const old=workers.at(-1)!,late=old.onmessage!
 await action(w,'取消处理').trigger('click');late({data:{ok:true,image:{width:1,height:1},blob:new Blob(['x'])}});await w.vm.$nextTick();expect(w.find('.crop-preview').exists()).toBe(false)
 await action(w,'重新检查图片').trigger('click');await vi.advanceTimersByTimeAsync(30000);expect(w.get('[role=status]').text()).toContain('超过 30 秒')
 await select(w);await respond(w);await action(w,'生成裁剪图片').trigger('click');const pending=workers.at(-1)!.onmessage!;await select(w);pending({data:{ok:true,output:{width:1,height:1},blob:new Blob(['x'])}});await w.vm.$nextTick();expect(w.find('a[download]').exists()).toBe(false)
 await respond(w);window.dispatchEvent(new Event('pagehide'));await w.vm.$nextTick();expect(w.find('.crop-preview').exists()).toBe(false);expect(URL.revokeObjectURL).toHaveBeenCalled()
 await action(w,'清空').trigger('click');expect(document.activeElement).toBe(w.get('#crop-file').element)
})
test('URL创建失败不发布输出、Worker错误不回显原始信息',async()=>{
 const w=setup();await select(w);await respond(w);await action(w,'生成裁剪图片').trigger('click')
 vi.mocked(URL.createObjectURL).mockImplementationOnce(()=>{throw Error('PRIVATE')});await respond(w);expect(w.find('a[download]').exists()).toBe(false);expect(w.get('[role=status]').text()).not.toContain('PRIVATE')
 await action(w,'生成裁剪图片').trigger('click');workers.at(-1)!.onerror!();await w.vm.$nextTick();expect(w.get('[role=status]').text()).toContain('失败');expect(w.find('.crop-preview').exists()).toBe(true)
})
