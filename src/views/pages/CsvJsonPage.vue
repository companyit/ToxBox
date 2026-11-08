<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { convertTable, tableErrors, type TableDirection } from '@/utils/csvJson'

const direction = ref<TableDirection>('csv-to-json'), input = ref(''), output = ref('')
const message = ref(''), error = ref(''), dimensions = ref(''), composing = ref(false), copying = ref(false)
const editor = ref<HTMLTextAreaElement>(), resultEditor = ref<HTMLTextAreaElement>()
const rules = computed(() => direction.value === 'csv-to-json'
  ? '英文逗号分隔；引号字段可含逗号或换行，字段内双引号写成两个双引号。闭引号后仅允许逗号、换行或结束，不自动 trim。首行是普通数据，单元格全部保留为字符串。'
  : '只接受二维字符串数组，各行至少一列且列数相同；不接受对象数组、数字、布尔值或 null。输出每个字段都加双引号，字段内引号翻倍，记录用 LF 分隔，不加结尾换行。[] 得到空结果。')
let version = 0, disposed = false
function invalidate() { version++; output.value = ''; dimensions.value = ''; message.value = ''; error.value = '' }
watch([input, direction], invalidate, { flush: 'sync' })
function run() {
  if (composing.value) return
  invalidate()
  const result = convertTable(input.value, direction.value)
  if (result.status === 'empty') message.value = '暂无内容。'
  else if (result.status === 'error') error.value = tableErrors[result.code]
  else {
    output.value = result.output
    dimensions.value = `${result.rows} 条记录，${result.columns} 列。`
    message.value = result.output ? '转换完成。' : '结果为空。'
  }
}
function releaseContent() { composing.value = false; input.value = ''; direction.value = 'csv-to-json'; invalidate() }
function clear() { if (composing.value) return; releaseContent(); editor.value?.focus() }
function example() {
  if (composing.value) return
  if (input.value) { message.value = '请先清空现有输入，再填入示例。'; return }
  input.value = direction.value === 'csv-to-json' ? '001,"甲,乙"\n002,"他说""好"""' : JSON.stringify([['001', '甲,乙'], ['002', '他说"好"']], null, 2)
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
  <ToolPageLayout page-name="csv-json">
    <div class="table-tool">
      <p id="table-rules">{{ rules }}</p>
      <p id="table-limits">输入最多 100,000、结果最多 1,000,000 个 UTF-16 码元，最多 1,000 条记录、100 列，不截断。CRLF、CR（包括字段内换行）统一为 LF；CSV 只移除开头一个 BOM。空行保留，末尾单个换行不增加记录。不接受空字符或孤立代理项。内容仅在当前页面内存中处理，不上传或保存。</p>
      <label for="table-direction">转换方向</label>
      <select id="table-direction" v-model="direction" :disabled="composing" aria-describedby="table-rules">
        <option value="csv-to-json">CSV → JSON</option>
        <option value="json-to-csv">JSON → CSV</option>
      </select>
      <label for="table-input">待转换的表格文本</label>
      <textarea id="table-input" ref="editor" v-model="input" rows="9" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" aria-describedby="table-rules table-limits table-status" @compositionstart="compositionStart" @compositionend="composing = false" />
      <div class="actions">
        <button type="button" :disabled="composing" @click="run">转换表格</button>
        <button type="button" :disabled="composing" @click="example">填入示例</button>
        <button type="button" :disabled="composing" @click="clear">清空</button>
      </div>
      <p id="table-status" role="status" aria-live="polite">{{ error || message }} {{ dimensions }}</p>
      <label for="table-result">表格结果（只读）</label>
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
button:disabled, select:disabled { opacity: .6; cursor: default; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
textarea:focus-visible, button:focus-visible, select:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
[role=status] { min-height: 1.7em; }
</style>
