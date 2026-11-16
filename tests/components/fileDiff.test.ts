import { afterEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import FileDiffPage from '../../src/views/pages/FileDiffPage.vue'
import { interactionReadyKey } from '../../src/interactionReady'
import { compareText } from '../../src/utils/textDiff'
class FakeWorker {
 static all: FakeWorker[]=[]
 onmessage: ((event: {data: any})=>void)|null=null
 onerror: (()=>void)|null=null
 terminate=vi.fn(); postMessage=vi.fn()
 constructor(){FakeWorker.all.push(this)}
}
let wrapper: ReturnType<typeof mount> | undefined
function setup(){vi.stubGlobal('Worker',FakeWorker); wrapper=mount(FileDiffPage,{global:{provide:{[interactionReadyKey as symbol]:ref(true)},stubs:{RouterLink:{template:'<a><slot /></a>'}}}});return wrapper}
async function select(w: ReturnType<typeof setup>,side: string,name='x.txt'){
 const node=w.get('#file-'+side).element
 Object.defineProperty(node,'files',{configurable:true,value:[new File(['x'],name)]})
 await w.get('#file-'+side).trigger('change');return FakeWorker.all.at(-1)!
}
afterEach(()=>{wrapper?.unmount();wrapper=undefined;FakeWorker.all=[];vi.unstubAllGlobals();vi.useRealTimers()})
test('两侧读取、对比、筛选及交换后旧结果失效，文件名不进报告',async()=>{
 const w=setup(), a=await select(w,'before','private.txt')
 a.onmessage!({data:{ok:true,text:'甲\n乙',lines:2}});await nextTick()
 expect(w.get('.primary-action').attributes()).toHaveProperty('disabled')
 const b=await select(w,'after');b.onmessage!({data:{ok:true,text:'甲\n丙',lines:2}});await nextTick()
 await w.get('.primary-action').trigger('click')
 FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareText('甲\n乙','甲\n丙')}});await nextTick()
 expect(w.get('.diff-summary').text()).toContain('新增 1 行')
 await w.findAll('button').find(x=>x.text()==='查看完整报告')!.trigger('click')
 expect((w.get('#diff-report').element as HTMLTextAreaElement).value).not.toContain('private.txt')
 await w.get('.filter input').setValue(true);expect(w.findAll('tbody tr')).toHaveLength(2)
 await w.findAll('button').find(x=>x.text()==='交换文件')!.trigger('click')
 expect(w.find('.diff-result').exists()).toBe(false)
 expect(w.get('#preview-before').element).toHaveProperty('value','甲\n丙')
})
test('快速重选、读取失败及pagehide废弃旧消息，其他侧保留',async()=>{
 const w=setup(), a=await select(w,'before'), b=await select(w,'after')
 b.onmessage!({data:{ok:true,text:'保留',lines:1}});await nextTick()
 const newer=await select(w,'before')
 a.onmessage!({data:{ok:true,text:'旧',lines:1}});await nextTick()
 expect(w.get('#preview-before').element).toHaveProperty('value','')
 newer.onmessage!({data:{ok:false,code:'encoding'}});await nextTick()
 expect(w.get('#file-status-before').text()).toContain('UTF-8')
 expect(w.get('#preview-after').element).toHaveProperty('value','保留')
 const late=await select(w,'before');window.dispatchEvent(new Event('pagehide'));await nextTick()
 late.onmessage!({data:{ok:true,text:'过期',lines:1}});await nextTick()
 expect(w.get('#preview-before').element).toHaveProperty('value','')
 expect(w.get('#preview-after').element).toHaveProperty('value','')
})
test('读取超时和取消可重试，不接受错误扩展名',async()=>{
 vi.useFakeTimers();const w=setup();await select(w,'before','secret.pdf')
 expect(FakeWorker.all).toHaveLength(0);expect(w.get('#file-status-before').text()).not.toContain('secret')
 const a=await select(w,'before');await vi.advanceTimersByTimeAsync(10000)
 expect(a.terminate).toHaveBeenCalled();expect(w.get('#file-status-before').text()).toContain('10 秒')
 await select(w,'before');await w.findAll('button').find(x=>x.text()==='取消原文件读取')!.trigger('click')
 expect(w.get('#file-status-before').text()).toContain('已取消')
})

test('分页最多200行，保持原行号和全局统计，报告按需包含全部筛选结果',async()=>{
 const w=setup(),source=Array.from({length:450},(_,i)=>'行'+i).join('\n')
 for(const side of ['before','after']){const worker=await select(w,side);worker.onmessage!({data:{ok:true,text:source,lines:450}});await nextTick()}
 await w.get('.primary-action').trigger('click')
 FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareText(source,source)}});await nextTick()
 expect(w.findAll('tbody tr')).toHaveLength(200)
 expect(w.find('#diff-report').exists()).toBe(false)
 const action=(name:string)=>w.findAll('button').find(b=>b.text()===name)!
 await action('下一页').trigger('click');await action('下一页').trigger('click')
 expect(w.findAll('tbody tr')).toHaveLength(50)
 expect(w.get('tbody tr td:nth-child(2)').text()).toBe('401')
 expect(w.get('.pagination').text()).toContain('第 3 / 3 页')
 expect(w.get('.diff-summary').text()).toContain('保留 450 行')
 await action('查看完整报告').trigger('click')
 const report=(w.get('#diff-report').element as HTMLTextAreaElement).value
 expect(report).toContain('= 保留\t1\t1\t行0');expect(report).toContain('= 保留\t450\t450\t行449')
 await w.get('.filter input').setValue(true)
 expect(w.findAll('tbody tr')).toHaveLength(0);expect(w.find('#diff-report').exists()).toBe(false)
 await w.get('.filter input').setValue(false);expect(w.get('.pagination').text()).toContain('第 1 / 3 页')
})
test('取消选择保留已加载内容，中文按钮独立显示，同文件可重选',async()=>{
 const w=setup(),worker=await select(w,'before','known.txt')
 worker.onmessage!({data:{ok:true,text:'已加载',lines:1}});await nextTick()
 expect(w.get('#file-before').attributes()).toHaveProperty('hidden')
 expect(w.findAll('button').some(b=>b.text()==='选择原文件')).toBe(true)
 Object.defineProperty(w.get('#file-before').element,'files',{configurable:true,value:[]})
 await w.get('#file-before').trigger('change')
 expect(w.get('#preview-before').element).toHaveProperty('value','已加载')
 expect(w.get('.file-meta').text()).toContain('known.txt')
 const next=await select(w,'before','known.txt')
 expect(next).not.toBe(worker);expect(w.get('#preview-before').element).toHaveProperty('value','')
})
test('懒生成报告的复制失败可选中全文，换筛选使迟到复制反馈失效',async()=>{
 const w=setup()
 for(const side of ['before','after']){const worker=await select(w,side);worker.onmessage!({data:{ok:true,text:'甲',lines:1}});await nextTick()}
 await w.get('.primary-action').trigger('click');FakeWorker.all.at(-1)!.onmessage!({data:{ok:true,result:compareText('甲','甲')}});await nextTick()
 vi.stubGlobal('isSecureContext',false)
 const copy=()=>w.findAll('button').find(b=>b.text()==='复制对比报告')!
 await copy().trigger('click');await nextTick()
 expect(w.get('#diff-status').text()).toContain('手动复制')
 expect((w.get('#diff-report').element as HTMLTextAreaElement).selectionStart).toBe(0)
 expect((w.get('#diff-report').element as HTMLTextAreaElement).selectionEnd).toBe((w.get('#diff-report').element as HTMLTextAreaElement).value.length)
 let resolve!:()=>void
 vi.stubGlobal('isSecureContext',true)
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise<void>(done=>{resolve=done})}})
 await copy().trigger('click');await w.get('.filter input').setValue(true);resolve();await Promise.resolve();await nextTick()
 expect(w.get('#diff-status').text()).not.toContain('已复制')
 expect(w.find('#diff-report').exists()).toBe(false)
})

test('对比取消与超时终止任务，迟到消息不能覆盖重试结果',async()=>{
 vi.useFakeTimers();const w=setup()
 for(const side of ['before','after']){const r=await select(w,side);r.onmessage!({data:{ok:true,text:'甲',lines:1}});await nextTick()}
 await w.get('.primary-action').trigger('click');const canceled=FakeWorker.all.at(-1)!
 await w.findAll('button').find(b=>b.text()==='取消对比')!.trigger('click')
 canceled.onmessage!({data:{ok:true,result:compareText('旧','旧')}});await nextTick()
 expect(canceled.terminate).toHaveBeenCalled();expect(w.find('.diff-result').exists()).toBe(false)
 await w.get('.primary-action').trigger('click');const timed=FakeWorker.all.at(-1)!
 await vi.advanceTimersByTimeAsync(10000)
 expect(timed.terminate).toHaveBeenCalled();expect(w.get('#diff-status').text()).toContain('10 秒')
 await w.get('.primary-action').trigger('click');const latest=FakeWorker.all.at(-1)!
 timed.onmessage!({data:{ok:true,result:compareText('过期','过期')}})
 latest.onmessage!({data:{ok:true,result:compareText('甲','甲')}});await nextTick()
 expect(w.get('.diff-summary').text()).toContain('保留 1 行')
 expect(w.get('tbody').text()).toContain('甲');expect(w.get('tbody').text()).not.toContain('过期')
})
