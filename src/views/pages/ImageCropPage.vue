<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { validateConvertFiles, type ImageFormat } from '@/utils/imageConvert'
import { cropErrors, validateCropRect, validateCropOptions, fitCropRatio, quantizeCrop, imagePoint, dragCrop, type CropRect, type CropRatio, type CropCode, type Corner, type Size } from '@/utils/imageCrop'
const picker = ref<HTMLInputElement>(), previewElement = ref<HTMLImageElement>(), file = ref<File>(), image = ref<Size>(), previewUrl = ref(''), resultUrl = ref(''), result = ref<{ width: number; height: number; bytes: number }>()
const draft = ref({ x: '0', y: '0', width: '1', height: '1' }), rect = ref<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
const ratio = ref<CropRatio>('free'), axis = ref<'width' | 'height'>('width'), outputSize = ref('1'), format = ref<ImageFormat>('png'), quality = ref('90')
const busy = ref<'' | 'inspect' | 'export'>(''), status = ref('请选择一张本地图片。'), composing = ref(false)
let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, version = 0
let dragging: { id: number; handle: 'move' | Corner; start: CropRect; x: number; y: number; target: HTMLElement } | undefined
function readRect(): CropRect { return { x: numeric(draft.value.x), y: numeric(draft.value.y), width: numeric(draft.value.width), height: numeric(draft.value.height) } }
function numeric(value: string) { return /^\d+$/.test(String(value)) ? Number(value) : NaN }
function errorText(error: unknown) { return cropErrors[(error as { code: CropCode })?.code] ?? cropErrors.failed }
const rectError = computed(() => { if (!image.value) return ''; try { validateCropRect(readRect(), image.value, ratio.value); return '' } catch (e) { return errorText(e) } })
const output = computed(() => {
  if (!image.value || rectError.value) return undefined
  try { return validateCropOptions(options(), image.value) } catch { return undefined }
})
const formError = computed(() => {
  if (!image.value) return ''
  try { validateCropOptions(options(), image.value); return '' } catch (e) { return errorText(e) }
})
function options() { return { rect: readRect(), ratio: ratio.value, axis: axis.value, size: numeric(outputSize.value), format: format.value, quality: numeric(quality.value) } }
function stop() { version++; worker?.terminate(); worker = undefined; clearTimeout(timer); timer = undefined; busy.value = '' }
function invalidate() { stop(); if (resultUrl.value) URL.revokeObjectURL(resultUrl.value); resultUrl.value = ''; result.value = undefined }
function setRect(value: CropRect) { rect.value = { ...value }; draft.value = { x: String(value.x), y: String(value.y), width: String(value.width), height: String(value.height) }; outputSize.value = String(value[axis.value]) }
function cancelDrag(restore: boolean) {
  const current = dragging; dragging = undefined
  if (!current) return
  if (current.target.hasPointerCapture?.(current.id)) current.target.releasePointerCapture(current.id)
  if (restore) setRect(current.start)
}
function release() {
  cancelDrag(false); invalidate(); if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''; image.value = undefined; file.value = undefined
  if (picker.value) picker.value.value = ''
  status.value = '已清空。'
}
function clear() { if (composing.value) return; release(); picker.value?.focus() }
function start(task: 'inspect' | 'export') {
  if (composing.value || !file.value) return
  invalidate(); const revision = version
  try {
    validateConvertFiles([file.value])
    if (task === 'export') { if (!image.value) return; validateCropOptions(options(), image.value) }
    busy.value = task; status.value = task === 'inspect' ? '正在检查图片…' : '正在生成图片…'
    worker = new Worker(new URL('../../workers/imageCrop.worker.ts', import.meta.url), { type: 'module' })
    timer = setTimeout(() => { if (revision === version) { invalidate(); status.value = '处理超过 30 秒，已停止，可重试。' } }, 30000)
    worker.onerror = () => { if (revision === version) { invalidate(); status.value = cropErrors.failed } }
    worker.onmessage = event => {
      if (revision !== version) return
      const data = event.data; stop()
      if (!data.ok) { status.value = cropErrors[data.code as CropCode] ?? cropErrors.failed; return }
      let url = ''
      try {
        url = URL.createObjectURL(data.blob)
        if (task === 'inspect') {
          if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
          image.value = data.image; previewUrl.value = url; ratio.value = 'free'; axis.value = 'width'
          setRect({ x: 0, y: 0, ...data.image }); status.value = '图片已就绪，可拖动裁剪框或填写坐标。'
        } else { result.value = { ...data.output, bytes: data.blob.size }; resultUrl.value = url; status.value = '生成完成，请核对预览后下载。' }
      } catch { if (url) URL.revokeObjectURL(url); status.value = cropErrors.failed }
    }
    worker.postMessage({ task, file: file.value, ...(task === 'export' ? { options: options() } : {}) })
  } catch (e) { invalidate(); status.value = errorText(e) }
}
function select(event: Event) {
  const input = event.target as HTMLInputElement, next = input.files?.[0]; input.value = ''
  if (!next) return
  release(); file.value = next
  try { validateConvertFiles([next]); start('inspect') } catch { status.value = cropErrors.files }
}
function edit(field: keyof CropRect, event: Event) {
  invalidate(); cancelDrag(false); draft.value[field] = (event.target as HTMLInputElement).value
  if (!rectError.value) { rect.value = readRect(); outputSize.value = String(rect.value[axis.value]) }
  status.value = '裁剪已修改，请核对尺寸后生成。'
}
function normalize(axisToEdit: 'width' | 'height') {
  if (composing.value || !image.value) return
  try { const value = quantizeCrop(readRect(), image.value, ratio.value, axisToEdit); const changed = value.width !== numeric(draft.value.width) || value.height !== numeric(draft.value.height); setRect(value); if (changed) status.value = `已按整数比例调整为 ${value.width} × ${value.height}。` } catch (e) { status.value = errorText(e) }
}
function changeRatio(event: Event) {
  invalidate(); cancelDrag(false)
  if (composing.value || !image.value) return
  const next = (event.target as HTMLSelectElement).value as CropRatio
  try { validateCropRect(readRect(), image.value, ratio.value); const value = fitCropRatio(readRect(), image.value, next); ratio.value = next; setRect(value); status.value = '比例已更新，请重新生成。' }
  catch (e) { (event.target as HTMLSelectElement).value = ratio.value; status.value = errorText(e) }
}
function restore() { if (composing.value || !image.value) return; cancelDrag(false); invalidate(); ratio.value = 'free'; axis.value = 'width'; setRect({ x: 0, y: 0, ...image.value }); status.value = '已恢复整图与原尺寸输出。' }
watch([format, quality, outputSize], () => { invalidate() }, { flush: 'sync' })
watch(axis, () => { invalidate(); outputSize.value = String(rect.value[axis.value]) }, { flush: 'sync' })
const overlay = computed(() => image.value ? { left: `${rect.value.x / image.value.width * 100}%`, top: `${rect.value.y / image.value.height * 100}%`, width: `${rect.value.width / image.value.width * 100}%`, height: `${rect.value.height / image.value.height * 100}%` } : {})
function down(event: PointerEvent, handle: 'move' | Corner) {
  if (event.button !== 0 || composing.value || rectError.value || !image.value || !previewElement.value || dragging) return
  event.preventDefault(); invalidate()
  const point = imagePoint(event.clientX, event.clientY, previewElement.value.getBoundingClientRect(), image.value)
  const target = event.currentTarget as HTMLElement
  dragging = { id: event.pointerId, handle, start: { ...rect.value }, x: point.x, y: point.y, target }
  target.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  if (!dragging || event.pointerId !== dragging.id || !image.value || !previewElement.value) return
  const point = imagePoint(event.clientX, event.clientY, previewElement.value.getBoundingClientRect(), image.value)
  setRect(dragCrop(dragging.start, image.value, ratio.value, dragging.handle, point.x - dragging.x, point.y - dragging.y))
}
function end(event: PointerEvent, restoreStart = false) { if (event.pointerId === dragging?.id) { cancelDrag(restoreStart); status.value = restoreStart ? '拖动已取消，恢复拖动前裁剪框。' : '裁剪框已更新，请重新生成。' } }
function cancel() { cancelDrag(true); invalidate(); status.value = '已取消，可保留当前文件和参数重试。' }
onMounted(() => window.addEventListener('pagehide', release))
onBeforeUnmount(() => { window.removeEventListener('pagehide', release); release() })
</script>
<template>
  <ToolPageLayout page-name="image-crop"><section class="crop-controls" aria-label="图片裁剪操作" @compositionstart="composing = true" @compositionend="composing = false">
    <p id="crop-rules">单张静态 JPG/PNG/WebP，最多 10 MiB、单边 10000 像素、2000 万像素。本地处理，不上传或保存；不支持动画、SVG、HEIC、隔行 PNG 或 CMYK JPEG。</p>
    <label for="crop-file">选择待裁剪图片</label><input id="crop-file" ref="picker" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-describedby="crop-rules" @change="select">
    <div class="actions"><button v-if="file && !image && !busy" type="button" @click="start('inspect')">重新检查图片</button><button v-if="busy" type="button" @click="cancel">取消处理</button><button type="button" @click="clear">清空</button></div>
    <template v-if="image">
      <p>原图 {{ image.width }} × {{ image.height }} 像素。预览最长边 1280 像素，仅供参考；导出始终使用原图。棋盘表示透明区域。</p>
      <div class="preview-space"><div class="crop-preview" @pointermove="move" @pointerup="end($event)" @pointercancel="end($event, true)" @lostpointercapture="end($event, true)">
        <img ref="previewElement" :src="previewUrl" alt="原图裁剪预览" draggable="false">
        <div class="crop-box" :style="overlay" @pointerdown.stop="down($event, 'move')"><span class="crop-caption">{{ rect.width }} × {{ rect.height }}</span>
          <span v-for="corner in (['nw', 'ne', 'sw', 'se'] as const)" :key="corner" :class="['crop-handle', corner]" aria-hidden="true" @pointerdown.stop="down($event, corner)"></span>
        </div>
      </div></div>
      <p id="crop-coordinates">从左上角 (0, 0) 按原图像素计数；可拖动框或四角，也可用以下输入完成全部操作。右边界和下边界不包含在选区内。</p>
      <div class="crop-options"><label>裁剪比例<select aria-label="裁剪比例" :value="ratio" @change="changeRatio"><option value="free">自由</option><option value="1:1">1:1</option><option value="4:3">4:3</option><option value="16:9">16:9</option></select></label>
        <label v-for="field in (['x', 'y', 'width', 'height'] as const)" :key="field">{{ {x:'X 坐标',y:'Y 坐标',width:'裁剪宽度',height:'裁剪高度'}[field] }}<input :value="draft[field]" type="number" :min="field === 'x' || field === 'y' ? 0 : 1" step="1" :aria-invalid="!!rectError" aria-describedby="crop-coordinates crop-error" @input="edit(field, $event)" @change="(field === 'width' || field === 'height') && normalize(field)"></label>
      </div>
      <button type="button" @click="restore">恢复整图</button>
      <div class="crop-options">
        <label>输出主尺寸<select aria-label="输出主尺寸" v-model="axis"><option value="width">按宽度</option><option value="height">按高度</option></select></label>
        <label>输出主尺寸（像素）<input v-model="outputSize" type="number" min="1" :max="rect[axis]" step="1" :aria-invalid="!output" aria-describedby="crop-error"></label>
        <label>输出格式<select aria-label="输出格式" v-model="format"><option value="png">PNG（保留透明）</option><option value="jpeg">JPG（白底）</option><option value="webp">WebP</option></select></label>
        <label>质量（10～100）<input v-model="quality" type="number" min="10" max="100" step="1" :disabled="format === 'png'"></label>
      </div>
      <p v-if="output">预计输出 {{ output.width }} × {{ output.height }} 像素，仅等比缩小、不放大；整数舍入可能有不足 1 像素比例误差。</p>
      <p id="crop-error" role="alert">{{ formError }}</p>
      <div class="actions"><button type="button" class="primary-action" :disabled="!output || !!busy" @click="start('export')">生成裁剪图片</button><a v-if="resultUrl" :href="resultUrl" :download="`cropped-image.${format === 'jpeg' ? 'jpg' : format}`">下载裁剪图片</a></div>
    </template>
    <p role="status" aria-live="polite">{{ status }}</p>
    <section v-if="result && resultUrl" aria-label="裁剪结果"><h2>裁剪结果</h2><p>{{ result.width }} × {{ result.height }} 像素 · {{ format.toUpperCase() }} · {{ (result.bytes / 1024).toFixed(1) }} KiB</p><img class="result-preview" :src="resultUrl" alt="裁剪结果预览"></section>
    <p>检查和生成各最多等待 30 秒，可取消；输出最多 100 MiB。PNG 不使用质量参数，WebP 编码取决于浏览器。改动文件或参数会撤销旧结果；下载由浏览器处理，请自行确认已保存。重绘不复制原始 EXIF/GPS，不保证全面隐私脱敏或色彩保真。</p>
  </section></ToolPageLayout>
</template>
<style scoped>
.crop-controls { display:grid; gap:16px; margin-block:24px; min-width:0; }
p { color:var(--color-muted); overflow-wrap:anywhere; }
label { display:grid; gap:8px; font-weight:650; min-width:0; }
.crop-options { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr)); gap:16px; }
input,select { width:100%; min-width:0; max-width:100%; }
button,input[type=number],select { min-height:44px; padding:8px 12px; border:1px solid var(--color-border); border-radius:var(--ui-control-radius); background:var(--color-surface); color:var(--color-text); font:inherit; }
button { cursor:pointer; justify-self:start; } button:disabled,input:disabled { opacity:.6; cursor:default; }
.primary-action { background:var(--color-accent); color:var(--color-on-accent); border-color:var(--color-accent); font-weight:650; }
.actions { display:flex; flex-wrap:wrap; align-items:center; gap:12px; } a { display:inline-flex; align-items:center; min-height:44px; }
.preview-space { padding:24px; min-width:0; border:1px solid var(--color-border); border-radius:12px; }
.crop-preview { position:relative; width:fit-content; max-width:100%; margin-inline:auto; line-height:0; background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0 / 16px 16px; }
.crop-preview > img { display:block; width:auto; height:auto; max-width:100%; user-select:none; }
.crop-box { position:absolute; border:2px solid #005fcc; box-shadow:0 0 0 1px #fff; cursor:move; touch-action:none; }
.crop-caption { position:absolute; left:0; top:0; background:#005fcc; color:white; font-size:12px; line-height:1.3; padding:2px; white-space:nowrap; pointer-events:none; max-width:100%; overflow:hidden; }
.crop-handle { position:absolute; width:44px; height:44px; touch-action:none; }
.crop-handle::after { content:''; position:absolute; top:16px; left:16px; width:12px; height:12px; border:2px solid white; background:#005fcc; outline:1px solid #005fcc; }
.nw { left:-23px; top:-23px; cursor:nwse-resize; } .ne { right:-23px; top:-23px; cursor:nesw-resize; } .sw { left:-23px; bottom:-23px; cursor:nesw-resize; } .se { right:-23px; bottom:-23px; cursor:nwse-resize; }
.result-preview { max-width:100%; max-height:480px; object-fit:contain; background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0 / 16px 16px; }
input:focus-visible,select:focus-visible { outline:3px solid var(--color-focus); outline-offset:3px; } [role=alert]:not(:empty) { color:var(--color-text); font-weight:650; }
</style>
