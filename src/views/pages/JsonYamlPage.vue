<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { jsonYamlErrors, type JsonYamlDirection, type JsonYamlResult } from '@/utils/jsonYaml'

const direction = ref<JsonYamlDirection>('json-to-yaml'), input = ref(''), output = ref('')
const busy = ref(false)
const message = ref(''), error = ref(''), dimensions = ref(''), composing = ref(false), copying = ref(false)
const editor = ref<HTMLTextAreaElement>(), resultEditor = ref<HTMLTextAreaElement>()
const rules = computed(() => direction.value === 'json-to-yaml'
  ? '严格 JSON 转 YAML 1.2，2 空格缩进；不接受注释、尾随逗号或重复键。'
  : 'YAML 1.2 单文档转 JSON，2 空格缩进；支持常用映射、列表和多行字符串，不保留注释与排版。yes/no 为字符串，日期不自动转换。')
let worker: Worker | undefined, timer: ReturnType<typeof setTimeout> | undefined
let version = 0, disposed = false
function invalidate() { version++; worker?.terminate(); worker = undefined; clearTimeout(timer); busy.value = false; output.value = ''; dimensions.value = ''; message.value = ''; error.value = '' }
watch([input, direction], invalidate, { flush: 'sync' })
function cancel() { invalidate(); message.value = '已取消，请调整内容后重试。' }
function run() {
  if (composing.value) return
  invalidate()
  if (input.value.length > 100000) { error.value = jsonYamlErrors.input; return }
  if (!input.value.trim()) { message.value = '暂无内容。'; return }
  const revision = version
  busy.value = true; message.value = '正在转换…'
  try {
    worker = new Worker(new URL('../../workers/jsonYaml.worker.ts', import.meta.url), { type: 'module' })
    timer = setTimeout(() => { if (revision === version) { invalidate(); error.value = '转换超过 10 秒，已停止，请减少内容后重试。' } }, 10000)
    worker.onerror = () => { if (revision === version) { invalidate(); error.value = jsonYamlErrors.failed } }
    worker.onmessage = (event: MessageEvent<JsonYamlResult>) => {
      if (revision !== version) return
      const result = event.data
      invalidate()
      if (result.status === 'empty') message.value = '暂无内容。'
      else if (result.status === 'error') error.value = jsonYamlErrors[result.code] + (result.line && result.col ? `（第 ${result.line} 行，第 ${result.col} 列）` : '')
      else { output.value = result.output; message.value = '转换完成。' }
    }
    worker.postMessage({ input: input.value, direction: direction.value })
  } catch { invalidate(); error.value = '当前浏览器无法启动本地转换，请更新浏览器后重试。' }
}
function releaseContent() { composing.value = false; input.value = ''; direction.value = 'json-to-yaml'; invalidate() }
function clear() { if (composing.value) return; releaseContent(); editor.value?.focus() }
function example() {
  if (composing.value) return
  if (input.value) { message.value = '请先清空现有输入，再填入示例。'; return }
  input.value = direction.value === 'json-to-yaml' ? '{"name":"ToolHug","enabled":true,"items":["001","中文"],"note":"第一行\\n第二行"}' : 'name: ToolHug\nenabled: true\nitems:\n  - "001"\n  - 中文\nnote: |-\n  第一行\n  第二行\n' 
  editor.value?.focus()
}
async function copy() {
  if (!output.value || copying.value || composing.value) return
  const snapshot = output.value, revision = version
  copying.value = true
  try {
    if (!window.isSecureContext || !navigator.clipboard?.writeText) throw new Error()
    await navigator.clipboard.writeText(snapshot)
    if (!disposed && revision === version) message.value = '结果已复制。'
  } catch {
    if (!disposed && revision === version) { message.value = '无法自动复制，请选中结果后手动复制。'; resultEditor.value?.focus(); resultEditor.value?.select() }
  } finally { if (!disposed) copying.value = false }
}
function compositionStart() { composing.value = true; invalidate() }
onMounted(() => window.addEventListener('pagehide', releaseContent))
onBeforeUnmount(() => { disposed = true; window.removeEventListener('pagehide', releaseContent); releaseContent() })
</script>

<template>
  <ToolPageLayout page-name="json-yaml">
    <div class="table-tool">
      <p id="table-rules">{{ rules }}</p>
      <p id="table-limits">输入最多 100,000、结果最多 1,000,000 个 UTF-16 码元，嵌套最多 30 层、节点最多 20,000（含键），不截断。不支持锚点、别名、合并键、显式类型标签、多文档、复杂或非字符串键。整数限安全范围，小数遵循 JS 浮点精度。仅在当前页面内存处理，不上传或保存；离页清空。</p>
      <label for="table-direction">转换方向</label>
      <select id="table-direction" v-model="direction" :disabled="composing" aria-describedby="table-rules">
        <option value="json-to-yaml">JSON → YAML</option>
        <option value="yaml-to-json">YAML → JSON</option>
      </select>
      <label for="table-input">待转换的 JSON 或 YAML</label>
      <textarea id="table-input" ref="editor" v-model="input" rows="9" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" aria-describedby="table-rules table-limits table-status" @compositionstart="compositionStart" @compositionend="composing = false" />
      <div class="actions">
        <button class="primary-action" type="button" :disabled="composing || busy" @click="run">转换格式</button>
        <button type="button" :disabled="composing" @click="example">填入示例</button>
        <button type="button" :disabled="composing" @click="clear">清空</button>
      </div>
      <button v-if="busy" type="button" @click="cancel">取消转换</button>
      <p id="table-status" role="status" aria-live="polite">{{ error || message }} {{ dimensions }}</p>
      <label for="table-result">转换结果（只读）</label>
      <textarea id="table-result" ref="resultEditor" :value="output" readonly rows="9" :spellcheck="false" aria-describedby="table-status" />
      <button type="button" :disabled="!output || copying || composing" @click="copy">复制结果</button>
    </div>
  </ToolPageLayout>
</template>

<style scoped>
.table-tool { display: grid; gap: 12px; min-width: 0; margin-block: 24px; }
p { color: var(--color-muted); overflow-wrap: anywhere; line-height: 1.7; }
label { font-weight: 650; }
textarea, select, button { box-sizing: border-box; max-width: 100%; min-width: 0; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; }
textarea { width: 100%; padding: 16px; resize: vertical; font-family: ui-monospace, monospace; line-height: 1.6; }
button, select { min-height: 44px; padding: 8px 16px; }
button { justify-self: start; cursor: pointer; }
.primary-action { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); font-weight: 650; }
button:disabled, select:disabled { opacity: .6; cursor: default; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
textarea:focus-visible, button:focus-visible, select:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
[role=status] { min-height: 1.7em; }
</style>
