import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Page from '../../src/views/pages/ImagesToPdfPage.vue'
const workers: FakeWorker[]=[]
class FakeWorker { onmessage?: (event:{data:unknown})=>void; onerror?:()=>void; terminate=vi.fn();postMessage=vi.fn();constructor(){workers.push(this)} }
const wrappers: ReturnType<typeof mount>[]=[]
function setup(){const w=mount(Page,{attachTo:document.body,global:{stubs:{ToolPageLayout:{template:'<div><slot /></div>'}}}});wrappers.push(w);return w}
beforeEach(()=>{workers.length=0;vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker);vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:synthetic');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{})})
afterEach(()=>{wrappers.forEach(w=>w.unmount());wrappers.length=0;vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks()})
async function choose(w:ReturnType<typeof mount>,names:string[]){const input=w.get('input');Object.defineProperty(input.element,'files',{configurable:true,value:names.map(n=>new File(['data'],n))});await input.trigger('change')}
async function pass(w:ReturnType<typeof mount>,count:number,generate=false){workers.at(-1)!.onmessage!({data:{ok:true,infos:Array.from({length:count},()=>({width:80,height:40})),...(generate?{bytes:new Uint8Array([1])}:{})}});await w.vm.$nextTick()}
test('原子追加失败保留、取消选择不失效、排序与参数撤销 URL、清空回焦',async()=>{
 const w=setup();await choose(w,['A.jpg','B.png','C.jpg']);await pass(w,3)
 await w.get('.actions button').trigger('click');await pass(w,3,true);expect(w.find('a[download]').exists()).toBe(true)
 await choose(w,[]);expect(w.find('a[download]').exists()).toBe(true)
 await w.get('[aria-label="上移第 3 张图片"]').trigger('click');expect(w.findAll('li').map(x=>x.text().slice(0,5))).toEqual(['A.jpg','C.jpg','B.png']);expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic')
 await choose(w,['bad.png']);workers.at(-1)!.onmessage!({data:{ok:false,code:'format'}});await w.vm.$nextTick();expect(w.findAll('li')).toHaveLength(3)
 await w.get('.actions button').trigger('click');await pass(w,3,true);await w.get('#image-margin').setValue('20');expect(w.find('a[download]').exists()).toBe(false)
 await w.get('[aria-label="删除第 2 张图片"]').trigger('click');expect(w.findAll('li')).toHaveLength(2)
 await w.get('.actions button:last-child').trigger('click');expect(w.findAll('li')).toHaveLength(0);expect(document.activeElement).toBe(w.get('input').element);expect(w.get('#image-margin').element).toHaveProperty('value','12')
})
test('取消、超时、离页与卸载阻止迟到消息，失败不回显文件内容',async()=>{
 const w=setup();await choose(w,['A.jpg']);await pass(w,1)
 for(const action of ['cancel','timeout','hide','unmount']){
  await choose(w,['PRIVATE.jpg']);const worker=workers.at(-1)!,late=worker.onmessage!
  expect(w.get('input').attributes()).toHaveProperty('disabled');expect(w.get('#image-direction').attributes()).toHaveProperty('disabled')
  if(action==='cancel')await w.get('.actions button:nth-child(2)').trigger('click')
  if(action==='timeout'){await vi.advanceTimersByTimeAsync(30000);expect(w.text()).toContain('超过 30 秒')}
  if(action==='hide')window.dispatchEvent(new Event('pagehide'))
  if(action==='unmount'){w.unmount();wrappers.splice(wrappers.indexOf(w),1)}
  late({data:{ok:true,infos:[{width:1,height:1},{width:1,height:1}]}});await w.vm.$nextTick();expect(worker.terminate).toHaveBeenCalled()
  if(action==='cancel'||action==='timeout')expect(w.findAll('li')).toHaveLength(1)
  if(action==='hide')expect(w.findAll('li')).toHaveLength(0)
 }
})
test('Worker 无法创建时显示能力错误且保留已检查列表',async()=>{
 const w=setup();await choose(w,['A.jpg']);await pass(w,1)
 vi.stubGlobal('Worker',class {constructor(){throw Error('PRIVATE')}})
 await w.get('.actions button').trigger('click');expect(w.get('[role="status"]').text()).toContain('不支持本地图片处理');expect(w.get('[role="status"]').text()).not.toContain('PRIVATE');expect(w.findAll('li')).toHaveLength(1)
})
