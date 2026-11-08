<script setup lang="ts">
import { computed, ref, shallowRef, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { parsePdfSelection, validateSplitFile, type PdfSplitMode } from '@/utils/pdfSelection'
import type { PdfSplitRequest, PdfSplitResponse } from '@/workers/pdfSplit.worker'
const file = shallowRef<File>()
const expression = ref(''), mode = ref<PdfSplitMode>('single'), pageCount = ref(0)
const phase = ref<'idle' | 'inspect' | 'export'>('idle'), composing = ref(false)
const status = ref('请选择本地 PDF 文件。'), picker = ref<HTMLInputElement>()
const downloads = ref<{ name: string; page?: number; url: string }[]>([])
let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, version = 0
const selection = computed(() => {
  if (!pageCount.value) return { pages: [] as number[], error: '' }
  try { return { pages: parsePdfSelection(expression.value, pageCount.value, mode.value), error: '' } }
  catch (error) { return { pages: [] as number[], error: (error as Error).message } }
})
function invalidate() {
  version++; worker?.terminate(); worker = undefined; clearTimeout(timer); phase.value = 'idle'
  for (const item of downloads.value) URL.revokeObjectURL(item.url)
  downloads.value = []
}
watch([expression, mode], () => { invalidate(); if (pageCount.value) status.value = '选页或模式已更新，请确认页序后导出。' }, { flush: 'sync' })
function clear(focus = false) {
  invalidate(); file.value = undefined; pageCount.value = 0; expression.value = ''; mode.value = 'single'; composing.value = false
  if (picker.value) picker.value.value = ''
  status.value = '已清空。'
  if (focus) void nextTick(() => picker.value?.focus())
}
function cancel() { invalidate(); status.value = '已取消，可调整后重试。' }
function startComposition() { composing.value = true; invalidate(); status.value = '正在编辑页码，完成输入后可导出。' }
function select(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (!selected) return
  invalidate(); pageCount.value = 0; expression.value = ''; file.value = selected
  run('inspect')
}
function selectAll() { if (pageCount.value && !composing.value) expression.value = pageCount.value === 1 ? '1' : `1-${pageCount.value}` }
function run(kind: 'inspect' | 'export') {
  if (composing.value || !file.value) return
  invalidate()
  try {
    validateSplitFile(file.value)
    if (kind === 'export') parsePdfSelection(expression.value, pageCount.value, mode.value)
  } catch (error) { status.value = (error as Error).message; return }
  const revision = version
  phase.value = kind; status.value = kind === 'inspect' ? '正在检查 PDF…' : '正在导出所选页面…'
  try {
    worker = new Worker(new URL('../../workers/pdfSplit.worker.ts', import.meta.url), { type: 'module' })
    timer = setTimeout(() => { if (revision === version) { invalidate(); status.value = '处理超过 30 秒，已停止，请减少页数后重试。' } }, 30000)
    worker.onerror = () => { if (revision === version) { invalidate(); status.value = 'PDF 处理失败，请检查文件或减少页数后重试。' } }
    worker.onmessage = (event: MessageEvent<PdfSplitResponse>) => {
      if (revision !== version) return
      const result = event.data
      invalidate()
      if (!result.ok) { status.value = result.message; return }
      if (result.kind === 'inspect') { pageCount.value = result.pageCount; status.value = '文件检查通过，请输入页码。'; return }
      const next: typeof downloads.value = []
      try {
        for (const output of result.outputs) next.push({ name: output.name, page: output.page, url: URL.createObjectURL(new Blob([output.bytes], { type: 'application/pdf' })) })
        downloads.value = next; status.value = '导出完成，请逐项点击下载。是否保存由浏览器或系统处理。'
      } catch {
        for (const item of next) URL.revokeObjectURL(item.url)
        status.value = '无法创建下载链接，未提供部分结果，请重新导出。'
      }
    }
    const request: PdfSplitRequest = kind === 'inspect' ? { kind, file: file.value } : { kind, file: file.value, expression: expression.value, mode: mode.value }
    worker.postMessage(request)
  } catch { if (revision === version) { invalidate(); status.value = '无法启动 PDF 处理，请重试或使用支持 Worker 的浏览器。' } }
}
const release = () => clear()
onMounted(() => window.addEventListener('pagehide', release))
onBeforeUnmount(() => { clear(); window.removeEventListener('pagehide', release) })
</script>
<template><ToolPageLayout page-name="pdf-split"><section class="split-controls">
<p>文件只在本地处理。每份最多 20 MiB、500 页；不支持损坏、加密或带 AcroForm 表单的 PDF。</p>
<label for="split-file">选择待拆分的 PDF</label><input id="split-file" ref="picker" type="file" accept=".pdf,application/pdf" :disabled="composing" @change="select">
<p v-if="file">已选：{{ file.name }}<span v-if="pageCount"> · {{ pageCount }} 页</span></p>
<button v-if="file && !pageCount && phase === 'idle'" :disabled="composing" @click="run('inspect')">重新检查文件</button>
<label for="split-mode">导出模式</label><select id="split-mode" v-model="mode" :disabled="!pageCount || composing"><option value="single">选页导出一份 PDF</option><option value="pages">逐页拆分（最多 20 页）</option></select>
<label for="split-pages">需要导出的页码</label><input id="split-pages" v-model="expression" type="text" :disabled="!pageCount" :aria-invalid="!!expression && !!selection.error" aria-describedby="split-rules split-selection" autocomplete="off" :spellcheck="false" placeholder="例如 1,3-5,8" @compositionstart="startComposition" @compositionend="composing = false">
<p id="split-rules">页码从 1 开始，用英文逗号和短横线，最多 1000 个 UTF-16 码元、100 个片段。按输入顺序展开，重复页保留首次出现，不自动排序。逐页拆分需主动逐项下载，不提供 ZIP 或自动批量下载。</p>
<p id="split-selection" aria-live="polite"><template v-if="selection.pages.length">已选择 {{ selection.pages.length }} 页；实际页序：{{ selection.pages.join(', ') }}</template><template v-else>{{ pageCount ? selection.error : '文件检查通过后可选择页码。' }}</template></p>
<div class="actions"><button :disabled="!pageCount || composing" @click="selectAll">选择全部页面</button><button :disabled="!selection.pages.length || phase !== 'idle' || composing" @click="run('export')">导出所选页面</button><button v-if="phase !== 'idle'" @click="cancel">取消处理</button><button :disabled="composing" @click="clear(true)">清空</button></div>
<p role="status" aria-live="polite">{{ status }}</p>
<ul v-if="downloads.length" class="split-downloads" aria-label="导出文件"><li v-for="item in downloads" :key="item.name"><a :href="item.url" :download="item.name">{{ item.page ? `下载第 ${item.page} 页：${item.name}` : `下载 ${item.name}` }}</a></li></ul>
<p>输出是新文档，不承诺书签、签名、附件或标签保真；选页不是安全清洗或隐私脱敏保证。任务超过 30 秒或结果总量超过 100 MiB 时不提供部分下载。</p>
</section></ToolPageLayout></template>
<style scoped>
.split-controls { display: grid; gap: 16px; min-width: 0; overflow-wrap: anywhere; }
input, select { box-sizing: border-box; width: 100%; max-width: 100%; min-height: 44px; padding: 8px 12px; font: inherit; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); }
.actions { display: flex; flex-wrap: wrap; gap: 12px; } button, a { min-height: 44px; padding: 8px 16px; } button { font: inherit; } a { display: inline-flex; align-items: center; max-width: 100%; overflow-wrap: anywhere; } .split-downloads { padding-left: 24px; }
</style>
