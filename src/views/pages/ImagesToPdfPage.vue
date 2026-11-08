<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { imagePdfErrors, validateImageFiles, type ImagePdfErrorCode } from '@/utils/imagePdfLimits'
import type { ImageInfo, ImagePdfOptions } from '@/utils/imagePdf'
const files = ref<File[]>([]), infos = ref<ImageInfo[]>([]), busy = ref(false), status = ref('请选择本地 JPG/PNG 图片。'), url = ref('')
const direction = ref<ImagePdfOptions['direction']>('portrait'), margin = ref<ImagePdfOptions['margin']>(12), picker = ref<HTMLInputElement>()
let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, version = 0
function invalidate() { version++; worker?.terminate(); worker = undefined; clearTimeout(timer); busy.value = false; if (url.value) URL.revokeObjectURL(url.value); url.value = '' }
watch([direction, margin], () => { invalidate(); status.value = '页面设置已更新，请重新生成。' }, { flush: 'sync' })
function release() { invalidate(); files.value = []; infos.value = []; direction.value = 'portrait'; margin.value = 12; if (picker.value) picker.value.value = ''; status.value = '已清空。' }
function clear() { release(); picker.value?.focus() }
function cancel() { invalidate(); status.value = '已取消，可调整图片后重试。' }
function run(next: File[], generate: boolean) {
  invalidate()
  const revision = version
  busy.value = true; status.value = generate ? '正在生成 PDF…' : '正在检查图片…'
  try {
    worker = new Worker(new URL('../../workers/imagesToPdf.worker.ts', import.meta.url), { type: 'module' })
    timer = setTimeout(() => { if (revision === version) { invalidate(); status.value = '处理超过 30 秒，已停止，请减少图片后重试。' } }, 30000)
    worker.onerror = () => { if (revision === version) { invalidate(); status.value = imagePdfErrors.failed } }
    worker.onmessage = event => {
      if (revision !== version) return
      const result = event.data
      invalidate()
      if (!result.ok) { status.value = imagePdfErrors[result.code as ImagePdfErrorCode] ?? imagePdfErrors.failed; return }
      files.value = next; infos.value = result.infos
      if (generate) { url.value = URL.createObjectURL(new Blob([result.bytes], { type: 'application/pdf' })); status.value = '生成完成，可以下载。请在浏览器中确认实际保存。' }
      else status.value = '图片检查通过，可排序并设置页面后生成。'
    }
    worker.postMessage({ files: next, options: generate ? { direction: direction.value, margin: margin.value } : undefined })
  } catch { invalidate(); status.value = imagePdfErrors.capability }
}
function select(event: Event) {
  const input = event.target as HTMLInputElement, additions = Array.from(input.files ?? []); input.value = ''
  if (!additions.length) return
  invalidate()
  const next = [...files.value, ...additions]
  try { validateImageFiles(next); run(next, false) } catch (error) { status.value = imagePdfErrors[(error as { code: ImagePdfErrorCode }).code] ?? imagePdfErrors.failed }
}
function move(index: number, delta: number) {
  const target = index + delta
  if (busy.value || target < 0 || target >= files.value.length) return
  invalidate()
  const next = [...files.value], details = [...infos.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  ;[details[index], details[target]] = [details[target]!, details[index]!]
  files.value = next; infos.value = details; status.value = '顺序已更新，请重新生成。'
}
function remove(index: number) { if (busy.value) return; invalidate(); files.value.splice(index, 1); infos.value.splice(index, 1); status.value = '图片已移除。' }
onMounted(() => window.addEventListener('pagehide', release))
onBeforeUnmount(() => { window.removeEventListener('pagehide', release); release() })
</script>
<template>
  <ToolPageLayout page-name="images-to-pdf"><section class="image-controls">
    <p id="image-rules">文件仅在本地处理，不上传。1～20 张普通 8 位 JPG/PNG，每张最多 10 MiB，总计最多 50 MiB；单边最多 10000 像素，每张最多 2000 万、总计最多 8000 万像素。不支持动画或隔行 PNG、CMYK JPEG、HEIC、WebP 或 SVG。</p>
    <label for="image-files">选择或追加 JPG/PNG 图片</label><input id="image-files" ref="picker" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple :disabled="busy" aria-describedby="image-rules" @change="select">
    <ol><li v-for="(file, i) in files" :key="i"><span>{{ file.name }} · {{ (file.size / 1024).toFixed(1) }} KiB · {{ infos[i]?.width }} × {{ infos[i]?.height }} 像素</span><div>
      <button :disabled="busy || i === 0" :aria-label="`上移第 ${i + 1} 张图片`" @click="move(i, -1)">上移</button><button :disabled="busy || i === files.length - 1" :aria-label="`下移第 ${i + 1} 张图片`" @click="move(i, 1)">下移</button><button :disabled="busy" :aria-label="`删除第 ${i + 1} 张图片`" @click="remove(i)">删除</button>
    </div></li></ol>
    <label for="image-direction">A4 页面方向</label><select id="image-direction" v-model="direction" :disabled="busy"><option value="portrait">纵向（210 × 297 mm）</option><option value="landscape">横向（297 × 210 mm）</option></select>
    <label for="image-margin">页面边距</label><select id="image-margin" v-model="margin" :disabled="busy"><option :value="0">0 mm</option><option :value="12">12 mm</option><option :value="20">20 mm</option></select>
    <p>每图一页，等比完整居中，不裁剪；允许放大，低分辨率图片可能模糊。透明区域铺白底，JPEG 按手机照片方向解码后重绘；不保证原字节、原色彩配置或打印色彩。30 秒超时可取消，结果最多 100 MiB。</p>
    <div class="actions"><button :disabled="busy || !files.length" @click="run([...files], true)">生成 PDF</button><button v-if="busy" @click="cancel">取消处理</button><button @click="clear">清空</button><a v-if="url" :href="url" download="images.pdf">下载 images.pdf</a></div>
    <p role="status" aria-live="polite">{{ status }}</p>
  </section></ToolPageLayout>
</template>
<style scoped>
.image-controls { display: grid; gap: 16px; min-width: 0; margin-block: 24px; }
p { color: var(--color-muted); line-height: 1.7; overflow-wrap: anywhere; } label { font-weight: 650; }
input, select { max-width: 100%; min-width: 0; } select { width: 100%; } li { overflow-wrap: anywhere; padding: 12px 0; } ol { padding-left: 24px; }
.actions, li div { display: flex; flex-wrap: wrap; gap: 12px; }
button, select, a { box-sizing: border-box; min-height: 44px; padding: 8px 16px; font: inherit; }
button, select { border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); }
button:disabled, select:disabled { opacity: .6; } button { cursor: pointer; }
input:focus-visible, button:focus-visible, select:focus-visible, a:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
