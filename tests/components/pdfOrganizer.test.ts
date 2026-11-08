import { afterEach, beforeEach, test, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PdfOrganizerPage from '../../src/views/pages/PdfOrganizerPage.vue'
vi.mock('../../src/utils/pdfPreview', () => ({ PdfPreviewSession: class {
  cache = new Map(); failures = new Set(); load = vi.fn(async () => {}); setWanted = vi.fn(); destroy = vi.fn(); retry = vi.fn()
} }))
const workers: FakeWorker[] = []
class FakeWorker {
  onmessage?: (event: { data: unknown }) => void
  onerror?: () => void
  postMessage = vi.fn(); terminate = vi.fn()
  constructor() { workers.push(this) }
}
beforeEach(() => {
  workers.length = 0; vi.useFakeTimers(); vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:test'); static revokeObjectURL = vi.fn() })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const options = { global: { stubs: { ToolPageLayout: { template: '<div><slot /></div>' } } } }
async function ready() {
  const wrapper = mount(PdfOrganizerPage, options), picker = wrapper.get('input[type=file]')
  Object.defineProperty(picker.element, 'files', { value: [new File(['%PDF-'], 'private.pdf')], configurable: true })
  await picker.trigger('change')
  workers.at(-1)!.onmessage!({ data: { ok: true, kind: 'inspect', geometry: [{ view: [0, 0, 200, 300], rotation: 0 }, { view: [0, 0, 200, 300], rotation: 90 }] } })
  await flushPromises(); return wrapper
}
async function click(wrapper: Awaited<ReturnType<typeof ready>>, text: string) { await wrapper.findAll('button').find(b => b.text() === text)!.trigger('click') }
test('编辑撤销下载，取消/迟到导出隔离，离页清理', async () => {
  const wrapper = await ready()
  await click(wrapper, '导出整理后的 PDF')
  workers.at(-1)!.onmessage!({ data: { ok: true, kind: 'export', bytes: new Uint8Array([1]) } }); await flushPromises()
  expect(wrapper.find('a[download]').exists()).toBe(true)
  await wrapper.get('button[aria-label="原第 1 页顺时针旋转"]').trigger('click')
  expect(wrapper.find('a[download]').exists()).toBe(false); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  await click(wrapper, '导出整理后的 PDF'); const worker = workers.at(-1)!, late = worker.onmessage!
  await click(wrapper, '取消处理'); late({ data: { ok: true, kind: 'export', bytes: new Uint8Array([1]) } }); await flushPromises()
  expect(worker.terminate).toHaveBeenCalled(); expect(wrapper.find('a[download]').exists()).toBe(false)
  expect(wrapper.findAll('.page-grid li')).toHaveLength(2)
  window.dispatchEvent(new Event('pagehide')); await flushPromises()
  expect(wrapper.text()).not.toContain('private.pdf'); expect(wrapper.findAll('.page-grid li')).toHaveLength(0)
  wrapper.unmount()
})
test('导出30秒超时、下载URL失败不发布旧结果，保留编辑', async () => {
  const wrapper = await ready()
  await click(wrapper, '导出整理后的 PDF'); const worker = workers.at(-1)!
  await vi.advanceTimersByTimeAsync(30000)
  expect(wrapper.text()).toContain('超过 30 秒'); expect(worker.terminate).toHaveBeenCalled()
  expect(wrapper.findAll('.page-grid li')).toHaveLength(2)
  await click(wrapper, '导出整理后的 PDF'); vi.mocked(URL.createObjectURL).mockImplementationOnce(() => { throw Error('test') })
  workers.at(-1)!.onmessage!({ data: { ok: true, kind: 'export', bytes: new Uint8Array([1]) } }); await flushPromises()
  expect(wrapper.find('a[download]').exists()).toBe(false); expect(wrapper.text()).toContain('无法创建下载链接')
  wrapper.unmount()
})
test('恢复需要确认，最后一页禁止删除', async () => {
  const wrapper = await ready()
  await wrapper.get('button[aria-label="删除原第 1 页"]').trigger('click')
  expect(wrapper.findAll('.page-grid li')).toHaveLength(1)
  expect(wrapper.get('button[aria-label="删除原第 2 页"]').attributes()).toHaveProperty('disabled')
  await click(wrapper, '恢复原始排列'); expect(wrapper.findAll('.page-grid li')).toHaveLength(1)
  await click(wrapper, '确认恢复'); expect(wrapper.findAll('.page-grid li')).toHaveLength(2)
  wrapper.unmount()
})
