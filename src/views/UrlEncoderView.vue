<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { processUrl, URL_INPUT_LIMIT } from '@/utils/urlEncoder'
import type { UrlAction, UrlErrorCode, UrlMode, UrlResult } from '@/types/urlEncoder'

const editor = ref<HTMLTextAreaElement | null>(null)
const outputEditor = ref<HTMLTextAreaElement | null>(null)
const input = ref('')
const mode = ref<UrlMode>('component')
const result = ref<UrlResult | null>(null)
const composing = ref(false)
const processing = ref(false)
const copying = ref(false)
const message = ref('')
let revision = 0
let disposed = false
const messages: Record<UrlErrorCode, string> = {
  'input-too-large': '输入超过 100,000 个 UTF-16 码元，原文已保留，请缩短后重试。',
  'invalid-unicode': '输入包含孤立的 UTF-16 代理项，无法编码；原文已保留。',
  'invalid-encoding': '无法解码：百分号转义或 UTF-8 编码无效；原文已保留。',
  unexpected: '处理时发生异常，原文已保留，请缩小内容后重试。',
}
const tooLong = computed(() => input.value.length > URL_INPUT_LIMIT)
const output = computed(() => result.value?.status === 'ok' ? result.value.output : '')
const error = computed(() => tooLong.value ? messages['input-too-large'] : result.value?.status === 'error' ? messages[result.value.code] : '')
const status = computed(() => [error.value, composing.value ? '输入中，完成后可手动处理。' : message.value].filter(Boolean).join(' '))
const initial = computed(() => input.value === '' && !output.value && !error.value && message.value === '' && mode.value === 'component')
function invalidate() { revision++; result.value = null; message.value = '' }
function onInput(event: Event) { invalidate(); input.value = (event.target as HTMLTextAreaElement).value }
function onCompositionStart() { invalidate(); composing.value = true }
function onCompositionEnd(event: CompositionEvent) { composing.value = false; onInput(event) }
function changeMode(event: Event) { invalidate(); mode.value = (event.target as HTMLSelectElement).value === 'uri' ? 'uri' : 'component' }
function execute(action: UrlAction) {
  if (composing.value || processing.value) return
  invalidate()
  processing.value = true
  try {
    result.value = processUrl({ input: input.value, mode: mode.value, action })
    if (result.value.status === 'ok') message.value = action === 'encode' ? '已编码一次。' : '已解码一次。'
  } catch { result.value = { status: 'error', code: 'unexpected' } }
  finally { processing.value = false }
}
function fillExample() {
  if (input.value !== '' || composing.value) return
  invalidate()
  input.value = '你好 world 😀'
  message.value = '已填入示例，请选择操作。'
  editor.value?.focus()
}
function clear() {
  if (composing.value) return
  invalidate()
  input.value = ''
  mode.value = 'component'
  editor.value?.focus()
}
async function copyResult() {
  if (!output.value || copying.value || composing.value) return
  const snapshot = output.value
  const copiedRevision = revision
  copying.value = true
  message.value = '正在复制…'
  try {
    if (!window.isSecureContext || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(snapshot)
    if (!disposed && copiedRevision === revision) message.value = '结果已复制。'
  } catch {
    if (!disposed && copiedRevision === revision) {
      outputEditor.value?.focus()
      outputEditor.value?.select()
      message.value = '无法自动复制，请选中结果后手动复制。'
    }
  } finally { if (!disposed) copying.value = false }
}
onBeforeUnmount(() => { disposed = true; revision++ })
</script>

<template>
  <div class="url-tool">
    <div id="url-rules" class="rules">
      <p>URI 组件模式用于单个路径片段或参数值；完整 URI 模式保留 /、?、&、=、# 等结构分隔符，不会保护参数值中已有的分隔符。</p>
      <p>空格编码为 %20；解码时 + 始终保持加号，不使用表单查询参数的加号空格规则。完整 URI 解码保留 %2F 等结构转义。</p>
      <p>每次只处理当前输入一轮，不自动重复编解码，不把结果写回输入，也不会访问结果地址。结果仅作纯文本显示，不代表可信链接或 HTML。</p>
      <p>编码孤立 UTF-16 代理项会失败；解码原样存在的孤立代理项会保留，但其非法 UTF-8 百分号编码会失败。解码成功不等于 Unicode 有效性校验。不可见字符及换行可能受显示或系统剪贴板规范化影响。</p>
      <p>最多 100,000 个 UTF-16 码元。仅在当前浏览器内存中处理，不上传或保存；刷新或收起工具后清空。</p>
    </div>
    <div class="workspace">
    <div class="editor-pane">
    <div class="editor-heading"><label for="url-input">输入或粘贴文本</label><span>{{ input.length.toLocaleString('zh-CN') }} / {{ URL_INPUT_LIMIT.toLocaleString('zh-CN') }} UTF-16 码元</span></div>
    <textarea id="url-input" ref="editor" :value="input" rows="10" aria-describedby="url-rules url-status" :aria-invalid="error ? 'true' : undefined" autocomplete="off" autocapitalize="off" :spellcheck="false" placeholder="例如：你好 world 😀" @input="onInput" @compositionstart="onCompositionStart" @compositionend="onCompositionEnd" />
    <div class="actions">
      <label for="url-mode">处理模式</label>
      <select id="url-mode" :value="mode" :disabled="composing" aria-describedby="url-rules" @change="changeMode"><option value="component">URI 组件</option><option value="uri">完整 URI</option></select>
      <button type="button" :disabled="composing || processing || tooLong" class="action-primary" @click="execute('encode')">编码</button>
      <button type="button" :disabled="composing || processing || tooLong" @click="execute('decode')">解码</button>
      <button type="button" :disabled="input !== '' || composing" class="action-quiet" @click="fillExample">填入示例</button>
      <button type="button" :disabled="initial || composing" class="action-quiet" @click="clear">清空</button>
    </div>
    <p id="url-status" class="status" role="status" aria-live="polite" aria-atomic="true">{{ status }}</p>
    </div>
    <div class="output-pane">
    <div class="editor-heading"><label for="url-output">处理结果（只读）</label></div>
    <textarea id="url-output" ref="outputEditor" :value="output" rows="10" readonly aria-describedby="url-rules url-status" autocomplete="off" :spellcheck="false" />
    <div class="actions"><button type="button" :disabled="!output || copying || composing" @click="copyResult">{{ copying ? '复制中…' : '复制结果' }}</button></div>
    </div>
    </div>
  </div>
</template>
<style scoped>
.url-tool { margin-top: var(--space-5); min-width: 0; }
.rules { color: var(--color-muted); font-size: 0.875rem; margin-bottom: var(--space-5); }
.rules p + p { margin-top: var(--space-3); }
.editor-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-3); }
.editor-heading span { color: var(--color-muted); font-size: 0.875rem; }
label { font-weight: 650; }
textarea { display: block; width: 100%; max-width: 100%; min-width: 0; padding: var(--space-4); resize: vertical; border: 1px solid var(--color-border); border-radius: var(--radius-small); background: var(--color-surface); color: var(--color-text); font: inherit; overflow-wrap: anywhere; }
#url-output { margin-top: var(--space-3); }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-4); }
button, select { min-height: 44px; max-width: 100%; padding: var(--space-2) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-small); background: var(--color-surface); color: var(--color-accent); font: inherit; }
button { cursor: pointer; font-weight: 600; }
button:disabled, select:disabled { color: var(--color-muted); cursor: default; opacity: 0.65; }
textarea:focus-visible, button:focus-visible, select:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
.status { min-height: 1.7em; margin-block: var(--space-3); color: var(--color-muted); overflow-wrap: anywhere; }

.workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; align-items: start; }
.editor-pane, .output-pane { min-width: 0; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--ui-panel-radius); background: var(--color-surface); }
textarea { font-size: 16px; line-height: 1.7; border-radius: var(--ui-control-radius); }
button, select { border-radius: var(--ui-control-radius); }
button:not(:disabled):hover { border-color: var(--color-accent); background: var(--color-accent-soft); }
button.action-primary { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); }
button.action-primary:not(:disabled):hover { background: var(--color-accent); text-decoration: underline; }
button.action-primary:disabled { background: var(--color-surface); color: var(--color-muted); border-color: var(--color-border); }
button.action-quiet { background: transparent; }
@media (min-width: 640px) { .editor-pane, .output-pane { padding: 24px; } }
@media (min-width: 1200px) { .workspace { grid-template-columns: repeat(2, minmax(0, 1fr)); } textarea { height: 384px; } }
textarea { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
#url-output { margin-top: 0; }
.output-pane > .editor-heading { min-height: 27px; }
</style>
