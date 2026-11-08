<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { calculateDate, dateErrors } from '@/utils/dateCalculator'
const mode = ref<'difference' | 'offset'>('difference')
const start = ref(''), end = ref(''), base = ref(''), days = ref(''), output = ref(''), message = ref(''), error = ref('')
const composing = ref(false), copying = ref(false), firstInput = ref<HTMLInputElement>(), resultEditor = ref<HTMLTextAreaElement>()
let version = 0, disposed = false
function invalidate() { version++; output.value = ''; message.value = ''; error.value = '' }
watch([mode, start, end, base, days], invalidate, { flush: 'sync' })
function run() {
  if (composing.value) return
  invalidate()
  const result = calculateDate(mode.value === 'difference' ? { mode: 'difference', start: start.value, end: end.value } : { mode: 'offset', base: base.value, days: days.value })
  if (result.status === 'empty') message.value = '暂无内容。'
  else if (result.status === 'error') error.value = dateErrors[result.code]
  else { output.value = result.output; message.value = '计算完成。' }
}
function releaseContent() { composing.value = false; start.value = ''; end.value = ''; base.value = ''; days.value = ''; mode.value = 'difference'; invalidate() }
async function clear() { if (composing.value) return; releaseContent(); await nextTick(); firstInput.value?.focus() }
function example() {
  if (composing.value) return
  if (start.value || end.value || base.value || days.value) { message.value = '请先清空现有输入，再填入示例。'; return }
  if (mode.value === 'difference') { start.value = '2024-02-28'; end.value = '2024-03-01' }
  else { base.value = '2024-02-28'; days.value = '1' }
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
  <ToolPageLayout page-name="date-calculator">
    <div class="date-tool">
      <p id="date-rules">仅计算公历日期，不涉及时间和时区。日期严格使用 YYYY-MM-DD，范围 0001-01-01～9999-12-31，不接受空白。日期差为结束减开始，不额外包含首尾，负值表示结束早于开始。天数只接受整数，正数向后、负数向前，不接受正号、前导零或 -0；绝对值最多 3652058。日期最多 10 字符、天数最多 8 字符，超限不截断。内容仅在本页内存处理，不上传或保存。</p>
      <label for="date-mode">计算模式</label>
      <select id="date-mode" v-model="mode" :disabled="composing"><option value="difference">日期差</option><option value="offset">日期加减</option></select>
      <template v-if="mode === 'difference'">
        <label for="date-start">开始日期</label><input id="date-start" ref="firstInput" v-model="start" type="text" placeholder="YYYY-MM-DD" autocomplete="off" :aria-invalid="!!error" aria-describedby="date-rules date-status" @compositionstart="compositionStart" @compositionend="composing = false">
        <label for="date-end">结束日期</label><input id="date-end" v-model="end" type="text" placeholder="YYYY-MM-DD" autocomplete="off" :aria-invalid="!!error" aria-describedby="date-rules date-status" @compositionstart="compositionStart" @compositionend="composing = false">
      </template>
      <template v-else>
        <label for="date-base">基准日期</label><input id="date-base" v-model="base" type="text" placeholder="YYYY-MM-DD" autocomplete="off" :aria-invalid="!!error" aria-describedby="date-rules date-status" @compositionstart="compositionStart" @compositionend="composing = false">
        <label for="date-days">加减天数</label><input id="date-days" v-model="days" type="text" placeholder="例如 -1、0、2" autocomplete="off" :aria-invalid="!!error" aria-describedby="date-rules date-status" @compositionstart="compositionStart" @compositionend="composing = false">
      </template>
      <div class="actions"><button :disabled="composing" @click="run">计算日期</button><button :disabled="composing" @click="example">填入示例</button><button :disabled="composing" @click="clear">清空</button></div>
      <p id="date-status" role="status" aria-live="polite">{{ error || message }}</p>
      <label for="date-result">日期计算结果（只读）</label><textarea id="date-result" ref="resultEditor" :value="output" readonly rows="2" aria-describedby="date-status" />
      <button :disabled="!output || copying || composing" @click="copy">复制结果</button>
    </div>
  </ToolPageLayout>
</template>
<style scoped>
.date-tool { display: grid; gap: 12px; min-width: 0; margin-block: 24px; }
p { color: var(--color-muted); overflow-wrap: anywhere; line-height: 1.7; }
label { font-weight: 650; }
input, textarea, select, button { box-sizing: border-box; max-width: 100%; min-width: 0; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; }
textarea { width: 100%; padding: 16px; resize: vertical; font-family: ui-monospace, monospace; line-height: 1.6; }
input { width: 100%; padding: 12px; }
button, select { min-height: 44px; padding: 8px 16px; }
button { justify-self: start; cursor: pointer; }
button:disabled, select:disabled { opacity: .6; cursor: default; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
input:focus-visible, textarea:focus-visible, button:focus-visible, select:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
[role=status] { min-height: 1.7em; }
</style>
