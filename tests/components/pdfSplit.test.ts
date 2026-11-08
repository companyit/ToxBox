import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PdfSplitPage from '../../src/views/pages/PdfSplitPage.vue'
import type { PdfSplitResponse } from '../../src/workers/pdfSplit.worker'
const workers: FakeWorker[] = []
class FakeWorker {
  onmessage?: (event: { data: PdfSplitResponse }) => void
  onerror?: () => void
  terminate = vi.fn(); postMessage = vi.fn()
  constructor() { workers.push(this) }
}
const options = { global: { stubs: { ToolPageLayout: { template: '<div><slot /></div>' } } } }
beforeEach(() => {
  workers.length = 0;vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker)
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:split-test')
    static revokeObjectURL = vi.fn(() => {})
  })
})
afterEach(() => { vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks() })
async function ready() {
  const wrapper = mount(PdfSplitPage,options)
  const picker = wrapper.get('input[type="file"]')
  Object.defineProperty(picker.element,'files',{value:[new File(['%PDF-'],'private.pdf')],configurable:true})
  await picker.trigger('change')
  workers.at(-1)!.onmessage!({data:{ok:true,kind:'inspect',pageCount:30}})
  await wrapper.vm.$nextTick();return wrapper
}
const outputs = [{name:'page-0003.pdf',page:3,bytes:new Uint8Array([1])},{name:'page-0001.pdf',page:1,bytes:new Uint8Array([2])}]
async function exportPages(wrapper: Awaited<ReturnType<typeof ready>>) {
  await wrapper.get('#split-pages').setValue('3,1');await wrapper.get('#split-mode').setValue('pages')
  const button = wrapper.findAll('button').find(button=>button.text()==='导出所选页面')!
  await button.trigger('click');return workers.at(-1)!
}
test('选页摘要、两种模式限制与输入法组合保护',async()=>{
  const wrapper = await ready()
  await wrapper.get('#split-pages').setValue('5,1-3,2');expect(wrapper.get('#split-selection').text()).toContain('5, 1, 2, 3')
  await wrapper.get('#split-mode').setValue('pages');await wrapper.get('#split-pages').setValue('1-21')
  expect(wrapper.get('#split-pages').element).toHaveProperty('value','1-21');expect(wrapper.get('#split-selection').text()).toContain('最多 20 页')
  await wrapper.get('#split-pages').setValue('1-2');await wrapper.get('#split-pages').trigger('compositionstart')
  const exportButton = wrapper.findAll('button').find(button=>button.text()==='导出所选页面')!
  expect(exportButton.attributes()).toHaveProperty('disabled')
  await wrapper.get('#split-pages').trigger('compositionend');expect(exportButton.attributes()).not.toHaveProperty('disabled')
  wrapper.unmount()
})
test('页码修改撤销下载，取消和迟到消息不覆盖新状态，离页清理',async()=>{
  const wrapper = await ready(),worker = await exportPages(wrapper)
  worker.onmessage!({data:{ok:true,kind:'export',outputs}});await wrapper.vm.$nextTick()
  expect(wrapper.findAll('a[download]')).toHaveLength(2)
  await wrapper.get('#split-pages').setValue('1');expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);expect(wrapper.findAll('a')).toHaveLength(0)
  const pending = await exportPages(wrapper),late = pending.onmessage!
  await wrapper.findAll('button').find(button=>button.text()==='取消处理')!.trigger('click')
  late({data:{ok:true,kind:'export',outputs}});await wrapper.vm.$nextTick();expect(wrapper.findAll('a')).toHaveLength(0);expect(wrapper.get('[role="status"]').text()).toContain('已取消')
  expect(wrapper.get('#split-pages').element).toHaveProperty('value','3,1')
  window.dispatchEvent(new Event('pagehide'));await wrapper.vm.$nextTick();expect(wrapper.text()).not.toContain('private.pdf');expect(wrapper.get('#split-pages').element).toHaveProperty('value','')
  wrapper.unmount()
})
test('创建第二个 URL 失败会回滚第一个，不发布部分结果',async()=>{
  const wrapper = await ready(),worker = await exportPages(wrapper)
  vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:first').mockImplementationOnce(()=>{throw Error('synthetic failure')})
  worker.onmessage!({data:{ok:true,kind:'export',outputs}});await wrapper.vm.$nextTick()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');expect(wrapper.findAll('a')).toHaveLength(0)
  expect(wrapper.get('[role="status"]').text()).toContain('未提供部分结果');expect(wrapper.get('#split-pages').element).toHaveProperty('value','3,1')
  wrapper.unmount()
})
test('导出超时终止 Worker，旧消息不恢复下载，文件与页码保留',async()=>{
  const wrapper = await ready(),worker = await exportPages(wrapper),late=worker.onmessage!
  await vi.advanceTimersByTimeAsync(30000);expect(worker.terminate).toHaveBeenCalled();expect(wrapper.get('[role="status"]').text()).toContain('超过 30 秒')
  late({data:{ok:true,kind:'export',outputs}});await wrapper.vm.$nextTick();expect(wrapper.findAll('a')).toHaveLength(0);expect(wrapper.text()).toContain('private.pdf');expect(wrapper.get('#split-pages').element).toHaveProperty('value','3,1')
  wrapper.unmount()
})
