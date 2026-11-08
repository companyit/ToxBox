import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PdfPage from '../../src/views/pages/PdfMergePage.vue'
import WordPage from '../../src/views/pages/WordToPdfPage.vue'
const workers: FakeWorker[]=[]
class FakeWorker {
 onmessage?: (event: {data: unknown})=>void
 onerror?: ()=>void
 terminate=vi.fn(); postMessage=vi.fn()
 constructor() { workers.push(this) }
}
const options={global:{stubs:{ToolPageLayout:{template:'<div><slot /></div>'}}}}
beforeEach(()=>{
 workers.length=0;vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker)
 vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:synthetic'),revokeObjectURL:vi.fn()}))
})
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
async function choose(wrapper: ReturnType<typeof mount>,file: File) {
 const input=wrapper.get('input[type="file"]')
 Object.defineProperty(input.element,'files',{value:[file],configurable:true})
 await input.trigger('change')
}
test('PDF 原子追加失败保留列表，重排撤销结果；取消与迟到消息不覆盖',async()=>{
 const w=mount(PdfPage,options)
 await choose(w,new File(['%PDF-1'],'A.pdf'))
 const first=workers.at(-1)!;first.onmessage!({data:{ok:true,counts:[1]}});await w.vm.$nextTick()
 await choose(w,new File(['%PDF-1'],'B.pdf'));workers.at(-1)!.onmessage!({data:{ok:true,counts:[1,1]}});await w.vm.$nextTick()
 await w.get('.actions button').trigger('click');workers.at(-1)!.onmessage!({data:{ok:true,counts:[1,1],bytes:new Uint8Array([1])}});await w.vm.$nextTick()
 expect(w.find('a[download]').exists()).toBe(true)
 await w.get('[aria-label="上移第 2 份文件"]').trigger('click');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic');expect(w.find('a[download]').exists()).toBe(false)
 await choose(w,new File(['%PDF-1'],'bad.pdf'));const pending=workers.at(-1)!,late=pending.onmessage!
 await w.get('.actions button:nth-child(2)').trigger('click');late({data:{ok:true,counts:[1,1,1]}});await w.vm.$nextTick()
 expect(w.findAll('li')).toHaveLength(2);expect(pending.terminate).toHaveBeenCalled()
 await choose(w,new File(['%PDF-1'],'bad.pdf'));workers.at(-1)!.onmessage!({data:{ok:false,message:'检查失败'}});await w.vm.$nextTick();expect(w.findAll('li')).toHaveLength(2)
 window.dispatchEvent(new Event('pagehide'));await w.vm.$nextTick();expect(w.findAll('li')).toHaveLength(0);w.unmount()
})
test('DOCX 超时终止 Worker，重选与清空使迟到预览失效',async()=>{
 const w=mount(WordPage,options)
 await choose(w,new File(['zip'],'A.docx'));await w.get('.actions button').trigger('click')
 const first=workers.at(-1)!,late=first.onmessage!
 await vi.advanceTimersByTimeAsync(30000);expect(w.text()).toContain('超过 30 秒');expect(first.terminate).toHaveBeenCalled()
 late({data:{ok:true,html:'<p>stale</p>',images:[]}});await w.vm.$nextTick();expect(w.find('.docx-content').exists()).toBe(false)
 await w.get('.actions button').trigger('click');const second=workers.at(-1)!
 await choose(w,new File(['zip'],'B.docx'));second.onmessage!({data:{ok:true,html:'<p>old</p>',images:[]}});await w.vm.$nextTick();expect(w.text()).not.toContain('old');expect(second.terminate).toHaveBeenCalled()
 window.dispatchEvent(new Event('pagehide'));await w.vm.$nextTick();expect(w.text()).not.toContain('B.docx');w.unmount()
})

async function prepareWordPreview() {
 const wrapper=mount(WordPage,options)
 await choose(wrapper,new File(['zip'],'A.docx'));await wrapper.get('.actions button').trigger('click')
 workers.at(-1)!.onmessage!({data:{ok:true,html:'<p>print sample</p>',images:[]}})
 await wrapper.vm.$nextTick()
 return wrapper
}
test('DOCX 清空后打印字体准备失败不会回写旧错误',async()=>{
 let fail!: (error: Error)=>void
 const ready=new Promise<void>((_,reject)=>{fail=reject})
 const original=Object.getOwnPropertyDescriptor(document,'fonts')
 Object.defineProperty(document,'fonts',{configurable:true,value:{ready}})
 const print=vi.spyOn(window,'print').mockImplementation(()=>{})
 const w=await prepareWordPreview()
 try {
  await w.get('.actions button:nth-child(2)').trigger('click')
  await Promise.resolve();await Promise.resolve()
  await w.get('.actions button:last-child').trigger('click')
  fail(Error('synthetic font failure'))
  await Promise.resolve();await Promise.resolve();await w.vm.$nextTick()
  expect(w.get('[role="status"]').text()).toBe('已清空。');expect(print).not.toHaveBeenCalled()
 } finally {w.unmount();print.mockRestore();if(original) Object.defineProperty(document,'fonts',original);else Reflect.deleteProperty(document,'fonts')}
})
test('DOCX 打印调用触发离页后不回写对话框结束提示',async()=>{
 const original=Object.getOwnPropertyDescriptor(document,'fonts')
 Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}})
 const print=vi.spyOn(window,'print').mockImplementation(()=>window.dispatchEvent(new Event('pagehide')))
 const w=await prepareWordPreview()
 try {
  await w.get('.actions button:nth-child(2)').trigger('click')
  await Promise.resolve();await Promise.resolve();await Promise.resolve();await w.vm.$nextTick()
  expect(print).toHaveBeenCalledOnce();expect(w.get('[role="status"]').text()).toBe('已清空。')
 } finally {w.unmount();print.mockRestore();if(original) Object.defineProperty(document,'fonts',original);else Reflect.deleteProperty(document,'fonts')}
})

test('DOCX 打印 API 返回只提示已请求，不推断对话框结束或保存',async()=>{
 const original=Object.getOwnPropertyDescriptor(document,'fonts')
 Object.defineProperty(document,'fonts',{configurable:true,value:{ready:Promise.resolve()}})
 const print=vi.spyOn(window,'print').mockImplementation(()=>{})
 const w=await prepareWordPreview()
 try {
  await w.get('.actions button:nth-child(2)').trigger('click')
  await Promise.resolve();await Promise.resolve();await Promise.resolve();await w.vm.$nextTick()
  expect(print).toHaveBeenCalledOnce()
  expect(w.get('[role="status"]').text()).toContain('已请求打印')
  expect(w.get('[role="status"]').text()).not.toMatch(/已结束|保存成功/)
 } finally {w.unmount();print.mockRestore();if(original) Object.defineProperty(document,'fonts',original);else Reflect.deleteProperty(document,'fonts')}
})
