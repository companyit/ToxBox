<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { cleanupText, type CleanupOperation } from '@/utils/textCleanup'

const operations: { value: CleanupOperation; label: string; description: string; example: string }[] = [
  { value: 'trim', label: '清理每行首尾空白', description: '按 ECMAScript trim 规则清理每行两端空白，保留行内空格。', example: '  甲 乙  \n\t丙\t' },
  { value: 'remove-empty', label: '删除空白行', description: '只删除去掉空白后为空的行，其余行原样保留。', example: '  甲  \n \n乙\n' },
  { value: 'dedupe', label: '按行去重', description: '按整行精确比较，区分大小写和首尾空白，保留第一次出现及原顺序。', example: '甲\n乙\n甲' },
  { value: 'ascending', label: '按行升序', description: '按固定 UTF-16 字符串顺序升序，空行参与；不是拼音或自然数字排序。', example: 'b\na\n10\n2' },
  { value: 'descending', label: '按行降序', description: '按固定 UTF-16 字符串顺序降序，空行参与；不是拼音或自然数字排序。', example: 'b\na\n10\n2' },
  { value: 'replace', label: '普通文本批量替换', description: '非重叠、区分大小写的普通文本匹配，不支持正则；$&、$1 均按字面文本处理。查找不能为空，替换可以为空。', example: 'aaaa' },
]
const input = ref(''), find = ref(''), replacement = ref(''), operation = ref<CleanupOperation>('trim')
const output = ref(''), message = ref(''), error = ref(''), copying = ref(false), composing = ref(false)
const editor = ref<HTMLTextAreaElement>(), resultEditor = ref<HTMLTextAreaElement>()
const currentOperation = computed(() => operations.find(item => item.value === operation.value)!)
let version = 0, disposed = false
function invalidate() { version++; output.value = ''; message.value = ''; error.value = '' }
watch([input, find, replacement, operation], invalidate, { flush: 'sync' })
function run() {
  if (composing.value) return
  invalidate()
  const result = cleanupText(operation.value === 'replace'
    ? { input: input.value, operation: 'replace', find: find.value, replacement: replacement.value }
    : { input: input.value, operation: operation.value })
  if (result.status === 'error') error.value = result.message
  else if (result.status === 'empty') message.value = '暂无内容。'
  else { output.value = result.output; message.value = result.output ? '处理完成。' : '结果为空。' }
}
function releaseContent() { composing.value = false; input.value = ''; find.value = ''; replacement.value = ''; operation.value = 'trim'; invalidate() }
function clear() { if (composing.value) return; releaseContent(); editor.value?.focus() }
function example() {
  if (composing.value) return
  if (input.value || find.value || replacement.value) { message.value = '请先清空现有输入，再填入示例。'; return }
  input.value = currentOperation.value.example
  if (operation.value === 'replace') { find.value = 'aa'; replacement.value = 'b' }
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
  <ToolPageLayout page-name="text-cleanup">
    <div class="cleanup-tool">
      <p id="cleanup-rules">每次仅执行一种操作，保留原输入。输入最多 100,000、查找与替换各 1,000、结果最多 1,000,000 个 UTF-16 码元，不截断。CRLF、CR 统一为 LF；结尾换行后的空串视为一行。内容仅在当前页面内存中处理，不上传或保存。</p>
      <label for="cleanup-operation">整理操作</label>
      <select id="cleanup-operation" v-model="operation" :disabled="composing" aria-describedby="cleanup-operation-help">
        <option v-for="item in operations" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <p id="cleanup-operation-help">{{ currentOperation.description }}</p>
      <label for="cleanup-input">待整理文本</label>
      <textarea id="cleanup-input" ref="editor" v-model="input" rows="8" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" aria-describedby="cleanup-rules cleanup-status" @compositionstart="compositionStart" @compositionend="composing = false" />
      <template v-if="operation === 'replace'">
        <label for="cleanup-find">查找文本</label>
        <textarea id="cleanup-find" v-model="find" rows="2" autocomplete="off" :spellcheck="false" aria-describedby="cleanup-operation-help cleanup-status" @compositionstart="compositionStart" @compositionend="composing = false" />
        <label for="cleanup-replacement">替换为（可为空）</label>
        <textarea id="cleanup-replacement" v-model="replacement" rows="2" autocomplete="off" :spellcheck="false" aria-describedby="cleanup-operation-help cleanup-status" @compositionstart="compositionStart" @compositionend="composing = false" />
      </template>
      <div class="actions">
        <button type="button" :disabled="composing" @click="run">处理文本</button>
        <button type="button" :disabled="composing" @click="example">填入示例</button>
        <button type="button" :disabled="composing" @click="clear">清空</button>
      </div>
      <p id="cleanup-status" role="status" aria-live="polite">{{ error || message }}</p>
      <label for="cleanup-result">整理结果（只读）</label>
      <textarea id="cleanup-result" ref="resultEditor" :value="output" readonly rows="8" :spellcheck="false" aria-describedby="cleanup-status" />
      <button type="button" :disabled="!output || copying || composing" @click="copy">复制结果</button>
    </div>
  </ToolPageLayout>
</template>

<style scoped>
.cleanup-tool { display: grid; gap: 12px; min-width: 0; margin-block: 24px; }
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
