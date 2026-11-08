<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import DocxContent from '@/components/tools/DocxContent.vue'
import { safeDocxPreview, type PreviewNode } from '@/utils/docxPreview'
const file = shallowRef<File>(), model = shallowRef<PreviewNode[]>([]), images = ref<Record<string, string>>({}), busy = ref(false), printing = ref(false), status = ref('请选择本地 DOCX 文件。'), picker = ref<HTMLInputElement>()
let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, version = 0
function invalidate() {
  version++; worker?.terminate(); worker = undefined; clearTimeout(timer); busy.value = false; printing.value = false
  Object.values(images.value).forEach(url => URL.revokeObjectURL(url)); images.value = {}; model.value = []
}
function clear() { invalidate(); file.value = undefined; if (picker.value) picker.value.value = ''; status.value = '已清空。' }
function select(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0]
  if (!selected) return
  invalidate(); file.value = selected; status.value = '文件已选择，点击转换以生成简版预览。'
}
function cancel() { invalidate(); status.value = '已取消，可重新转换。' }
function convert() {
  invalidate()
  if (!file.value || !/\.docx$/i.test(file.value.name) || !file.value.size || file.value.size > 10 * 1024 ** 2) { status.value = '请选择非空 DOCX 文件，最大 10 MiB；不支持 DOC 或 DOCM。'; return }
  const revision = version
  busy.value = true; status.value = '正在本地转换…'
  worker = new Worker(new URL('../../workers/docx.worker.ts', import.meta.url), { type: 'module' })
  timer = setTimeout(() => { if (revision === version) { invalidate(); status.value = '处理超过 30 秒，已停止。' } }, 30000)
  worker.onerror = () => { if (revision === version) { invalidate(); status.value = '转换失败，请检查文件后重试。' } }
  worker.onmessage = event => {
    if (revision !== version) return
    const result = event.data; invalidate()
    if (!result.ok) { status.value = result.message; return }
    try {
      const safe = safeDocxPreview(result.html, result.images)
      for (const image of safe.images) images.value[image.id] = URL.createObjectURL(new Blob([image.bytes], { type: image.type }))
      model.value = safe.model
      status.value = result.warning ? '已生成简版预览，部分结构不受支持，请仔细核对正文。' : '已生成简版预览，请核对内容和排版后打印。'
    } catch { invalidate(); status.value = '文档内容无法安全预览或超过限额，请使用简单文档重试。' }
  }
  worker.postMessage(file.value)
}
async function print() {
  if (!model.value.length || busy.value || printing.value) return
  const revision = version; printing.value = true
  await nextTick()
  try {
    const nodes = Array.from(document.querySelectorAll<HTMLImageElement>('#docx-print img'))
    await Promise.all(nodes.map(image => image.decode()))
    await document.fonts.ready
    if (revision !== version) return
    window.print(); if (revision !== version) return
    status.value = '已请求打印。请在系统对话框选择另存为 PDF，是否保存请自行确认。'
  } catch { if (revision === version) status.value = '图片或打印准备失败，请检查预览后重试。' }
  finally { if (revision === version) printing.value = false }
}
onMounted(() => window.addEventListener('pagehide', clear))
onBeforeUnmount(() => { clear(); window.removeEventListener('pagehide', clear) })
</script>
<template><ToolPageLayout page-name="word-to-pdf"><section class="docx-controls">
<p>仅支持本地 DOCX 简版重排，不上传文件。接受字体、表格和分页差异；不支持旧 DOC、宏或加密文件。</p>
<label for="docx-file">选择 DOCX（最多 10 MiB）</label><input id="docx-file" ref="picker" type="file" accept=".docx" @change="select"><p v-if="file">已选：{{ file.name }}</p>
<div class="actions"><button :disabled="busy || !file" @click="convert">转换并预览</button><button v-if="busy" @click="cancel">取消处理</button><button :disabled="!model.length || busy || printing" @click="print">打印 / 另存为 PDF</button><button @click="clear">清空</button></div>
<p role="status" aria-live="polite">{{ status }}</p><p>在系统打印对话框选择“另存为 PDF”，并自行关闭网址/时间页眉页脚。只打印转换正文；不保留原始字体、页眉页脚、修订批注、文本框和原始分页，不承诺原版式。外链仅保留文字，不加载外部图片。</p>
<section v-if="model.length" aria-label="简版文档预览"><DocxContent :nodes="model" :images="images" /></section>
</section><Teleport v-if="model.length" to="body"><div id="docx-print"><DocxContent :nodes="model" :images="images" /></div></Teleport></ToolPageLayout></template>
<style scoped>
.docx-controls { display: grid; gap: 16px; min-width: 0; overflow-wrap: anywhere; } input { max-width: 100%; } .actions { display: flex; flex-wrap: wrap; gap: 12px; } button { min-height: 44px; padding: 8px 16px; }
</style>
