<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { validatePdfFiles } from '@/utils/pdfLimits'
const files = ref<File[]>([]), counts = ref<number[]>([]), busy = ref(false), status = ref('请选择本地 PDF。'), url = ref('')
const picker = ref<HTMLInputElement>()
let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined, version = 0
function invalidate() { version++; worker?.terminate(); worker = undefined; clearTimeout(timer); busy.value = false; if (url.value) URL.revokeObjectURL(url.value); url.value = '' }
function clear() { invalidate(); files.value = []; counts.value = []; if (picker.value) picker.value.value = ''; status.value = '已清空。' }
function cancel() { invalidate(); status.value = '已取消，可调整文件后重试。' }
function run(next: File[], merge: boolean) {
  invalidate()
  const revision = version
  busy.value = true; status.value = merge ? '正在合并…' : '正在检查文件…'
  worker = new Worker(new URL('../../workers/pdfMerge.worker.ts', import.meta.url), { type: 'module' })
  timer = setTimeout(() => { if (revision === version) { invalidate(); status.value = '处理超过 30 秒，已停止，请减少文件后重试。' } }, 30000)
  worker.onerror = () => { if (revision === version) { invalidate(); status.value = '处理失败，请减少文件后重试。' } }
  worker.onmessage = event => {
    if (revision !== version) return
    const result = event.data
    invalidate()
    if (!result.ok) { status.value = result.message; return }
    files.value = next; counts.value = result.counts
    if (merge) { url.value = URL.createObjectURL(new Blob([result.bytes], { type: 'application/pdf' })); status.value = '合并完成，可以下载。下载是否保存由浏览器处理。' }
    else status.value = '文件检查通过，可调整顺序后合并。'
  }
  worker.postMessage({ files: next, merge })
}
function select(event: Event) {
  const input = event.target as HTMLInputElement
  const next = [...files.value, ...Array.from(input.files ?? [])]; input.value = ''
  if (next.length === files.value.length) return
  invalidate()
  try { validatePdfFiles(next); run(next, false) } catch (e) { status.value = (e as Error).message }
}
function move(index: number, delta: number) {
  invalidate(); const target = index + delta
  if (target < 0 || target >= files.value.length) return
  const next = [...files.value], pages = [...counts.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  ;[pages[index], pages[target]] = [pages[target]!, pages[index]!]
  files.value = next; counts.value = pages; status.value = '顺序已更新，请重新合并。'
}
function remove(index: number) { invalidate(); files.value.splice(index, 1); counts.value.splice(index, 1); status.value = '文件已移除。' }
onMounted(() => window.addEventListener('pagehide', clear))
onBeforeUnmount(() => { clear(); window.removeEventListener('pagehide', clear) })
</script>
<template><ToolPageLayout page-name="pdf-merge"><section class="pdf-controls">
<p>文件只在浏览器中处理，不上传。2～10 份，每份最多 20 MiB，总计最多 50 MiB、500 页。</p>
<label for="pdf-files">选择或追加 PDF 文件</label><input id="pdf-files" ref="picker" type="file" accept=".pdf,application/pdf" multiple :disabled="busy" @change="select">
<ol><li v-for="(file, i) in files" :key="i"><span>{{ file.name }} · {{ (file.size / 1024).toFixed(1) }} KiB · {{ counts[i] }} 页</span><div><button :disabled="busy || i === 0" :aria-label="`上移第 ${i + 1} 份文件`" @click="move(i, -1)">上移</button><button :disabled="busy || i === files.length - 1" :aria-label="`下移第 ${i + 1} 份文件`" @click="move(i, 1)">下移</button><button :disabled="busy" :aria-label="`删除第 ${i + 1} 份文件`" @click="remove(i)">删除</button></div></li></ol>
<div class="actions"><button :disabled="busy || files.length < 2" @click="run([...files], true)">合并 PDF</button><button v-if="busy" @click="cancel">取消处理</button><button @click="clear">清空</button><a v-if="url" :href="url" download="merged.pdf">下载 merged.pdf</a></div>
<p role="status" aria-live="polite">{{ status }}</p><p>拒绝加密及带 AcroForm 表单的文件。输出为新文档，不保留签名有效性、书签、附件或文档结构；本工具不是安全清洗器，不嵌入预览未知 PDF。</p>
</section></ToolPageLayout></template>
<style scoped>
.pdf-controls { display: grid; gap: 16px; min-width: 0; } input { max-width: 100%; } li { overflow-wrap: anywhere; padding: 12px 0; } .actions, li div { display: flex; flex-wrap: wrap; gap: 12px; } button, a { min-height: 44px; padding: 8px 16px; } ol { padding-left: 24px; }
</style>
