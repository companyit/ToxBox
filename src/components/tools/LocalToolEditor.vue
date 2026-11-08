<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = defineProps<{ label: string; rules: string; example: string; limit: number; transform: (input: string) => string; revisionKey?: string; actionLabel?: string; initialInput?: string; quantity?: boolean }>()
const input = ref(props.initialInput ?? ''), output = ref(''), error = ref(''), message = ref('')
const editor = ref<HTMLTextAreaElement | HTMLInputElement>(), resultEditor = ref<HTMLTextAreaElement>()
const copying = ref(false), composing = ref(false)
let version = 0, disposed = false
function invalidate() { version++; output.value = ''; message.value = ''; error.value = input.value.length > props.limit ? `输入超过 ${props.limit.toLocaleString('zh-CN')} 个 UTF-16 码元，请缩短后重试。` : '' }
watch([input, () => props.revisionKey], invalidate, { flush: 'sync' })
function run() {
  invalidate()
  if (error.value || composing.value) return
  try { output.value = props.transform(input.value); message.value = output.value ? '处理完成。' : '暂无内容。' }
  catch (e) { error.value = e instanceof Error ? e.message : '处理失败，请重试。' }
}
function clear() { input.value = ''; invalidate(); editor.value?.focus() }
async function copy() {
  if (!output.value || copying.value) return
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
function releaseContent() { input.value = ''; invalidate() }
onMounted(() => window.addEventListener('pagehide', releaseContent))
onBeforeUnmount(() => { disposed = true; window.removeEventListener('pagehide', releaseContent); releaseContent() })
</script>
<template>
  <div class="local-tool">
    <p id="local-rules">{{ rules }} 内容仅在当前页面内存中处理，不上传或保存；离页或刷新后清空。</p>
    <div class="options"><slot /></div>
    <label for="local-input">{{ label }}</label>
    <input v-if="quantity" id="local-input" ref="editor" v-model="input" type="text" inputmode="numeric" autocomplete="off" :aria-invalid="!!error" aria-describedby="local-rules local-status" />
    <textarea v-else id="local-input" ref="editor" v-model="input" rows="7" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" aria-describedby="local-rules local-status" @compositionstart="composing = true; invalidate()" @compositionend="composing = false" />
    <div class="actions">
      <button class="primary-action" type="button" :disabled="composing || !!error" @click="run">{{ actionLabel || '转换' }}</button>
      <button type="button" :disabled="composing" @click="input = example; editor?.focus()">填入示例</button>
      <button type="button" :disabled="composing" @click="clear">清空</button>
    </div>
    <p id="local-status" role="status" aria-live="polite">{{ error || message }}</p>
    <label for="local-result">处理结果（只读）</label>
    <textarea id="local-result" ref="resultEditor" :value="output" readonly rows="7" :spellcheck="false" aria-describedby="local-status" />
    <button type="button" :disabled="!output || copying || composing" @click="copy">复制结果</button>
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
</style>
