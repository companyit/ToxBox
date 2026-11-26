<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = defineProps<{ label: string; rules: string; example: string; limit: number; transform: (input: string) => string | { output: string; message: string }; revisionKey?: string; actionLabel?: string; initialInput?: string; quantity?: boolean; inputContext?: string; workspace?: boolean; inputHint?: string; resultContext?: string; rows?: number }>()
const emit = defineEmits<{ reset: []; invalidate: [] }>()
const input = ref(props.initialInput ?? ''), output = ref(''), error = ref(''), message = ref('')
const editor = ref<HTMLTextAreaElement | HTMLInputElement>(), resultEditor = ref<HTMLTextAreaElement>()
const copying = ref(false), composing = ref(false), hasOutput = ref(false)
let version = 0, disposed = false
function invalidate() { emit('invalidate'); version++; hasOutput.value = false; output.value = ''; message.value = ''; error.value = input.value.length > props.limit ? `输入超过 ${props.limit.toLocaleString('zh-CN')} 个 UTF-16 码元，请缩短后重试。` : '' }
watch([input, () => props.revisionKey], invalidate, { flush: 'sync' })
function run() {
  invalidate()
  if (error.value || composing.value) return
  try {
    const result = props.transform(input.value)
    if (typeof result === 'string') {
      output.value = result
      hasOutput.value = Boolean(result)
      message.value = result ? '处理完成。' : '暂无内容。'
    } else {
      output.value = result.output
      hasOutput.value = true
      message.value = result.message
    }
  }
  catch (e) { error.value = e instanceof Error ? e.message : '处理失败，请重试。' }
}
function runAndFocus() {
  run()
  if (hasOutput.value) resultEditor.value?.focus()
  else editor.value?.focus()
}
function clear() { emit('reset'); input.value = ''; invalidate(); editor.value?.focus() }
async function copy() {
  if (!hasOutput.value || copying.value) return
  const snapshot = output.value, current = version
  copying.value = true
  try {
    if (!window.isSecureContext || !navigator.clipboard?.writeText) throw new Error()
    await navigator.clipboard.writeText(snapshot)
    if (!disposed && current === version) message.value = '结果已复制。'
  } catch {
    if (!disposed && current === version) { message.value = '无法自动复制，请选中结果后手动复制。'; resultEditor.value?.focus(); resultEditor.value?.select() }
  } finally { if (!disposed) copying.value = false }
}
function setInput(value: string) {
  if (value === input.value) invalidate()
  else input.value = value
}
function fillExample() { emit('reset'); input.value = props.example; invalidate(); editor.value?.focus() }
function releaseContent() { emit('reset'); input.value = ''; composing.value = false; invalidate() }
watch(() => props.inputContext, releaseContent, { flush: 'sync' })
onMounted(() => window.addEventListener('pagehide', releaseContent))
onBeforeUnmount(() => { disposed = true; window.removeEventListener('pagehide', releaseContent); releaseContent() })
</script>
<template>
  <div class="local-tool" :class="{ 'local-workspace': workspace }">
    <p id="local-rules">{{ rules }} 内容仅在当前页面内存中处理，不上传或保存；离页或刷新后清空。</p>
    <div class="options"><slot /></div>
    <div class="input-panel">
      <div class="input-fields">
        <div class="editor-field">
          <label for="local-input">{{ label }}</label>
          <input v-if="quantity" id="local-input" ref="editor" v-model="input" type="text" inputmode="numeric" autocomplete="off" :aria-invalid="!!error" :aria-describedby="inputHint ? 'local-input-hint local-rules local-status' : 'local-rules local-status'" />
          <textarea v-else id="local-input" ref="editor" v-model="input" :rows="rows ?? 7" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" :aria-describedby="inputHint ? 'local-input-hint local-rules local-status' : 'local-rules local-status'" @compositionstart="composing = true; invalidate()" @compositionend="composing = false" />
          <p v-if="inputHint" id="local-input-hint" class="field-hint">{{ inputHint }}</p>
        </div>
        <slot name="after-input" :input="input" :set-input="setInput" />
      </div>
      <div class="actions">
        <button class="primary-action" type="button" :disabled="composing || !!error" @click="run">{{ actionLabel || '转换' }}</button>
        <button type="button" :disabled="composing" @click="fillExample">填入示例</button>
        <button type="button" :disabled="composing" @click="clear">清空</button>
      </div>
      <p id="local-status" role="status" aria-live="polite">{{ error || message }}</p>
    </div>
    <div class="result-panel">
      <div class="result-heading">
        <label for="local-result">处理结果（只读）</label>
        <span v-if="resultContext" id="local-result-context">{{ resultContext }}</span>
      </div>
      <textarea id="local-result" ref="resultEditor" :value="output" readonly :rows="rows ?? 7" :spellcheck="false"
        :placeholder="workspace && !hasOutput ? `点击「${actionLabel || '转换'}」后在此显示结果` : undefined"
        :aria-describedby="resultContext ? 'local-result-context local-status' : 'local-status'" />
      <button type="button" :disabled="!hasOutput || copying || composing" @click="copy">复制结果</button>
      <slot name="result-actions" :output="output" :has-output="hasOutput && !composing" :run="runAndFocus" />
    </div>
  </div>
</template>
<style scoped>
.local-tool { min-width: 0; display: grid; gap: 16px; margin-block: 24px; }
p { color: var(--color-muted); overflow-wrap: anywhere; }
label { font-weight: 650; }
input, textarea { box-sizing: border-box; width: 100%; min-width: 0; padding: 16px; resize: vertical; font: inherit; font-family: ui-monospace, monospace; line-height: 1.6; }
input, textarea, button, :deep(select) { border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); }
button, :deep(select) { min-height: 44px; padding: 8px 16px; font: inherit; max-width: 100%; }
button { cursor: pointer; justify-self: start; }
button.primary-action { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); font-weight: 650; }
button:not(:disabled):hover { border-color: var(--color-accent); }
button:disabled { opacity: .6; cursor: default; }
.actions, .options { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
input:focus-visible, textarea:focus-visible, button:focus-visible, :deep(select:focus-visible) { outline: 3px solid var(--color-focus); outline-offset: 3px; }
[role=status] { min-height: 1.6em; }
.input-panel, .input-fields, .editor-field, .result-panel, .result-heading { display: contents; }
.local-workspace .result-heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 12px; }
.field-hint, #local-result-context { margin: 0; font-size: .875rem; color: var(--color-muted); }
.local-workspace {
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding: clamp(12px, 3vw, 24px);
  border: 1px solid var(--color-border);
  border-radius: var(--ui-card-radius, 20px);
  background: var(--color-surface);
}
.local-workspace > p, .local-workspace > .options:empty { display: none; }
.local-workspace > .options { grid-column: 1 / -1; }
.local-workspace > .options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.local-workspace .input-panel, .local-workspace .result-panel,
.local-workspace .input-fields, .local-workspace .editor-field {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 10px;
}
.local-workspace .input-fields {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
}
.local-workspace .editor-field > input { max-width: 14rem; }
.local-workspace textarea { min-height: 7rem; padding: 12px; }
.local-workspace .result-panel {
  padding: 16px;
  border-radius: var(--ui-control-radius);
  background: var(--color-accent-soft);
}
.local-workspace #local-result { font-size: 1.05rem; }
.local-workspace #local-status { font-size: .875rem; }
</style>
