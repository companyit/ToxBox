<script setup lang="ts">
import { ref, shallowRef, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { initialOrganizerPlan, moveOrganizerPage, validateOrganizerFile, type OrganizerPage, type OrganizerGeometry } from '@/utils/pdfOrganizerPlan'
import type { PdfPreviewSession, PdfThumbnail } from '@/utils/pdfPreview'
const file = shallowRef<File>(), plan = ref<OrganizerPage[]>([]), geometry = ref<OrganizerGeometry[]>([])
const geometryReady = ref(false), previewChecking = ref(false)
const status = ref('请选择本地 PDF。'), previewStatus = ref(''), phase = ref<'idle' | 'inspect' | 'export'>('idle')
const picker = ref<HTMLInputElement>(), cards = ref<HTMLOListElement>(), download = ref(''), confirmRestore = ref(false)
const thumbnails = shallowRef(new Map<string, PdfThumbnail>()), failures = shallowRef(new Set<string>())
let processing: Worker | undefined, processingTimer: ReturnType<typeof setTimeout> | undefined, previewTimer: ReturnType<typeof setTimeout> | undefined
let previewVersion = 0, version = 0, fileVersion = 0, preview: PdfPreviewSession | undefined, observer: IntersectionObserver | undefined
const visible = new Set<number>(); let dragging: number | undefined
const key = (p: OrganizerPage) => `${p.sourceIndex}:${p.rotationDelta}`
function invalidate() {
  version++; processing?.terminate(); processing = undefined; clearTimeout(processingTimer); phase.value = 'idle'
  if (download.value) URL.revokeObjectURL(download.value)
  download.value = ''
}
function refreshThumbnails() { thumbnails.value = new Map(preview?.cache); failures.value = new Set(preview?.failures) }
function stopPreview() {
  previewVersion++; previewChecking.value = false
  clearTimeout(previewTimer); observer?.disconnect(); observer = undefined; visible.clear()
  const previous = preview; preview = undefined; previous?.destroy(); refreshThumbnails()
}
function updateWanted() { preview?.setWanted(plan.value.filter(p => visible.has(p.sourceIndex))) }
function observeCards() {
  observer?.disconnect(); visible.clear()
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) { const id = Number((entry.target as HTMLElement).dataset.page); if (entry.isIntersecting) visible.add(id); else visible.delete(id) }
    updateWanted()
  }, { rootMargin: '400px' })
  cards.value?.querySelectorAll<HTMLElement>('[data-page]').forEach(card => observer!.observe(card))
}
async function loadPreview(revision: number) {
  if (!file.value || !geometry.value.length) return
  stopPreview(); const previewRevision = previewVersion; geometryReady.value = false; previewChecking.value = true; previewStatus.value = '正在检查缩略图页面…'
  const currentFile = file.value
  previewTimer = setTimeout(() => {
    if (revision === fileVersion && previewRevision === previewVersion) { stopPreview(); plan.value = []; previewStatus.value = '预览检查超过 30 秒，已停止，请重新检查文件。' }
  }, 30_000)
  try {
    const { PdfPreviewSession } = await import('@/utils/pdfPreview')
    if (revision !== fileVersion || previewRevision !== previewVersion) return
    const session = new PdfPreviewSession(refreshThumbnails, () => {
      if (preview === session) { stopPreview(); previewStatus.value = '缩略图处理超过 10 秒，已停止，可重新加载预览。' }
    })
    preview = session
    await session.load(currentFile, geometry.value)
    if (revision !== fileVersion || preview !== session) return
    clearTimeout(previewTimer); previewChecking.value = false; geometryReady.value = true; previewStatus.value = '缩略图按需加载；仍可根据原页码整理。'
    await nextTick(); observeCards()
  } catch {
    if (revision === fileVersion && previewRevision === previewVersion) { stopPreview(); previewStatus.value = '缩略图检查失败或页面几何不一致，请重新检查文件。'; plan.value = []; geometry.value = []; invalidate() }
  }
}
function clear(focus = false) {
  fileVersion++; geometryReady.value = false; invalidate(); stopPreview(); file.value = undefined; plan.value = []; geometry.value = []; confirmRestore.value = false
  previewStatus.value = ''; status.value = '已清空。'; dragging = undefined
  if (picker.value) picker.value.value = ''
  if (focus) void nextTick(() => picker.value?.focus())
}
function select(event: Event) {
  const next = (event.target as HTMLInputElement).files?.[0]
  if (!next) return
  fileVersion++; invalidate(); stopPreview(); plan.value = []; geometry.value = []; file.value = next; confirmRestore.value = false; previewStatus.value = ''
  run('inspect')
}
function cancel() {
  const inspecting = phase.value === 'inspect' || (phase.value !== 'export' && previewChecking.value)
  invalidate()
  if (inspecting) { geometryReady.value = false; fileVersion++; stopPreview(); plan.value = []; geometry.value = [] }
  status.value = '已取消，当前文件及编辑保留，可重试。'
}
function run(kind: 'inspect' | 'export') {
  if (!file.value) return
  invalidate()
  try { validateOrganizerFile(file.value) } catch (error) { status.value = (error as Error).message; return }
  if (kind === 'export' && !geometryReady.value) return
  if (kind === 'inspect') { geometryReady.value = false; fileVersion++; stopPreview(); plan.value = []; geometry.value = [] }
  const revision = version, sourceRevision = fileVersion
  phase.value = kind; status.value = kind === 'inspect' ? '正在检查 PDF…' : '正在导出整理后的 PDF…'
  try {
    processing = new Worker(new URL('../../workers/pdfOrganizer.worker.ts', import.meta.url), { type: 'module' })
    processingTimer = setTimeout(() => { if (revision === version) { cancel(); status.value = '处理超过 30 秒，已停止，请减少页数后重试。' } }, 30_000)
    processing.onerror = () => { if (revision === version) { invalidate(); status.value = 'PDF 处理失败，请重试。' } }
    processing.onmessage = (event: MessageEvent<{ ok: boolean; kind?: string; message?: string; geometry?: OrganizerGeometry[]; bytes?: Uint8Array<ArrayBuffer> }>) => {
      if (revision !== version) return
      const data = event.data; invalidate()
      if (!data.ok) { status.value = data.message ?? 'PDF 处理失败。'; return }
      if (data.kind === 'inspect' && data.geometry) {
        geometry.value = data.geometry; plan.value = initialOrganizerPlan(data.geometry.length)
        status.value = '文件检查通过，请整理页面后导出。'; void loadPreview(sourceRevision); return
      }
      try { download.value = URL.createObjectURL(new Blob([data.bytes!], { type: 'application/pdf' })); status.value = '导出完成，请点击下载；是否保存由浏览器或系统处理。' }
      catch { status.value = '无法创建下载链接，请重新导出。' }
    }
    processing.postMessage(kind === 'inspect' ? { kind, file: file.value } : { kind, file: file.value, plan: plan.value.map(p => ({ ...p })) })
  } catch { invalidate(); status.value = '无法启动 PDF 处理，请使用支持 Worker 的浏览器。' }
}
function edited(message: string, sourceIndex?: number) {
  invalidate(); confirmRestore.value = false; status.value = message
  void nextTick(() => {
    observeCards()
    if (sourceIndex !== undefined) cards.value?.querySelector<HTMLElement>(`[data-page="${sourceIndex}"] .page-label`)?.focus()
  })
}
function move(from: number, to: number) {
  if (to < 0 || to >= plan.value.length) return
  const sourceIndex = plan.value[from]!.sourceIndex; plan.value = moveOrganizerPage(plan.value, from, to)
  edited(`原第 ${sourceIndex + 1} 页已移至第 ${to + 1} 位。`, sourceIndex)
}
function rotate(item: OrganizerPage, delta: number) { item.rotationDelta = (item.rotationDelta + delta + 360) % 360; edited(`原第 ${item.sourceIndex + 1} 页旋转增量 ${item.rotationDelta}°。`, item.sourceIndex) }
function remove(index: number) {
  if (plan.value.length <= 1) return
  const removed = plan.value.splice(index, 1)[0]!
  edited(`已删除原第 ${removed.sourceIndex + 1} 页，至少保留一页。`, plan.value[Math.min(index, plan.value.length - 1)]!.sourceIndex)
}
function restore() { plan.value = initialOrganizerPlan(geometry.value.length); edited('已恢复全部原始页面、顺序及旋转。', 0) }
function startDrag(event: DragEvent, sourceIndex: number) {
  dragging = sourceIndex
  if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(sourceIndex)) }
}
function drop(index: number) { if (dragging !== undefined) { const from = plan.value.findIndex(p => p.sourceIndex === dragging); if (from >= 0) move(from, index) }; dragging = undefined }
watch(plan, updateWanted, { deep: true })
const release = () => clear()
onMounted(() => window.addEventListener('pagehide', release))
onBeforeUnmount(() => { clear(); window.removeEventListener('pagehide', release) })
</script>
<template><ToolPageLayout page-name="pdf-organizer"><section class="organizer">
<p>本地整理 PDF，每份最多 20 MiB、100 页。不支持损坏、加密或带表单的文件。文件不会上传。</p>
<label for="organizer-file">选择待整理的 PDF</label><input id="organizer-file" ref="picker" type="file" accept=".pdf,application/pdf" @change="select">
<p v-if="file">已选：{{ file.name }}<span v-if="geometry.length"> · 原 {{ geometry.length }} 页，保留 {{ plan.length }} 页</span></p>
<div class="actions"><button v-if="file && !plan.length && phase === 'idle'" @click="run('inspect')">重新检查文件</button><button :disabled="!plan.length || !geometryReady || phase !== 'idle'" class="primary" @click="run('export')">导出整理后的 PDF</button><button v-if="phase !== 'idle' || previewChecking" @click="cancel">取消处理</button><button @click="clear(true)">清空</button><button :disabled="!plan.length" @click="confirmRestore = true">恢复原始排列</button></div>
<div v-if="confirmRestore" class="restore-confirm"><p>将恢复全部原页、原始顺序及旋转，覆盖当前编辑。是否继续？</p><button @click="restore">确认恢复</button><button @click="confirmRestore = false">保留当前编辑</button></div>
<p role="status">{{ status }}</p><p v-if="previewStatus" role="status">{{ previewStatus }}</p>
<button v-if="plan.length" @click="loadPreview(fileVersion)">重新加载预览</button>
<a v-if="download" :href="download" download="organized.pdf" class="download">下载 organized.pdf</a>
<p v-if="plan.length" id="organizer-order">实际页序：{{ plan.map(p => p.sourceIndex + 1).join(', ') }}</p>
<ol v-if="plan.length" ref="cards" class="page-grid" aria-label="PDF 页面排列">
<li v-for="(item, index) in plan" :key="item.sourceIndex" :data-page="item.sourceIndex" draggable="true" @dragstart="startDrag($event, item.sourceIndex)" @dragend="dragging = undefined" @dragover.prevent @drop.prevent="drop(index)">
<span class="drag-handle" draggable="true" @dragstart.stop="startDrag($event, item.sourceIndex)">拖动排序</span>
<p class="page-label" tabindex="-1">第 {{ index + 1 }} 位 · 原第 {{ item.sourceIndex + 1 }} 页</p>
<div class="thumbnail"><img v-if="thumbnails.has(key(item))" :src="thumbnails.get(key(item))!.url" :width="thumbnails.get(key(item))!.width" :height="thumbnails.get(key(item))!.height" :alt="`原第 ${item.sourceIndex + 1} 页缩略图`" draggable="false"><template v-else-if="failures.has(key(item))"><p>缩略图不可用</p><button @click="loadPreview(fileVersion)">重试缩略图</button></template><span v-else>缩略图等待加载</span></div>
<p>旋转增量 {{ item.rotationDelta }}°</p>
<div class="page-actions"><button :disabled="index === 0" :aria-label="`原第 ${item.sourceIndex + 1} 页前移`" @click="move(index, index - 1)">前移</button><button :disabled="index === plan.length - 1" :aria-label="`原第 ${item.sourceIndex + 1} 页后移`" @click="move(index, index + 1)">后移</button><button :aria-label="`原第 ${item.sourceIndex + 1} 页逆时针旋转`" @click="rotate(item, -90)">逆时针90°</button><button :aria-label="`原第 ${item.sourceIndex + 1} 页顺时针旋转`" @click="rotate(item, 90)">顺时针90°</button><button :disabled="plan.length === 1" :aria-label="`删除原第 ${item.sourceIndex + 1} 页`" @click="remove(index)">删除</button></div>
</li></ol>
<p>可拖动单页，或使用前移/后移按钮排序。导出复制原 PDF 页面，不把缩略图转成图片 PDF；不承诺书签、签名、附件或链接保真，也不提供安全清洗。预览失败不代表原页空白，请核对下载结果。输出最多 100 MiB。</p>
</section></ToolPageLayout></template>
<style scoped>
.organizer { display: grid; gap: 16px; min-width: 0; overflow-wrap: anywhere; }
.actions,.page-actions { display: flex; flex-wrap: wrap; gap: 12px; } button,.download { min-height: 44px; padding: 8px 12px; font: inherit; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); color: var(--color-text); background: var(--color-surface); } button:disabled { opacity: .55; cursor: default; } .primary { background: var(--color-accent); color: var(--color-on-accent); }
.drag-handle { cursor: grab; user-select: none; display: inline-block; padding: 8px; border: 1px dashed var(--color-border); border-radius: 6px; }
.page-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,260px),1fr)); gap: 16px; list-style: none; padding: 0; min-width: 0; }.page-grid li { min-width: 0; border: 1px solid var(--color-border); border-radius: 12px; padding: 12px; display: grid; gap: 12px; }.page-label:focus { outline: 3px solid var(--color-focus); outline-offset: 3px; }
.thumbnail { height: 320px; min-height: 320px; display: flex; align-items: center; justify-content: center; flex-direction: column; background: var(--color-surface); }.thumbnail img { display: block; max-width: 100%; height: auto; max-height: 320px; object-fit: contain; }.restore-confirm { border: 1px solid var(--color-border); padding: 12px; }.download { justify-self: start; display: inline-flex; align-items: center; }
</style>
