<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { JSON_INPUT_LIMIT, processJson } from '@/utils/jsonFormatter'
import type { JsonAction, JsonErrorCode, JsonIndent, JsonResult } from '@/types/jsonFormatter'

const editor = ref<HTMLTextAreaElement | null>(null)
const outputEditor = ref<HTMLTextAreaElement | null>(null)
const input = ref('')
const indent = ref<JsonIndent>(2)
const result = ref<JsonResult | null>(null)
const composing = ref(false)
const copying = ref(false)
const processing = ref(false)
const message = ref('')
let revision = 0
let disposed = false
const messages: Record<JsonErrorCode, string> = {
  empty: '请输入 JSON。',
  'input-too-large': '输入超过 100,000 个 UTF-16 码元，原文已保留，请缩短后重试。',
  'too-deep': 'JSON 嵌套超过 100 层，请减少嵌套后重试。',
  'invalid-json': 'JSON 语法错误，请检查引号、逗号或括号。',
  'unsafe-integer': '存在超出安全整数范围的数字，无法安全转换；如需精确保留，请在原数据中使用字符串。',
  'non-finite-number': '数字超出 JavaScript 有限数范围，无法安全转换；请保留原文并检查数字。',
  'output-too-large': '输出超过 1,000,000 个 UTF-16 码元，请缩小内容后重试。',
  unexpected: '处理 JSON 时发生异常，原文已保留，请缩小内容后重试。',
}
const tooLong = computed(() => input.value.length > JSON_INPUT_LIMIT)
const output = computed(() => result.value?.status === 'converted' ? result.value.output : '')
const error = computed(() => tooLong.value ? messages['input-too-large'] : result.value?.status === 'error' ? messages[result.value.code] : '')
const status = computed(() => [error.value, composing.value ? '输入中，完成后可手动处理。' : message.value].filter(Boolean).join(' '))
const initial = computed(() => input.value === '' && result.value === null && message.value === '' && indent.value === 2)
function invalidate() {
  revision++
  result.value = null
  message.value = ''
}
function onInput(event: Event) {
  invalidate()
  input.value = (event.target as HTMLTextAreaElement).value
}
function onCompositionStart() { invalidate(); composing.value = true }
function onCompositionEnd(event: CompositionEvent) { composing.value = false; onInput(event) }
function changeIndent(event: Event) {
  invalidate()
  indent.value = (event.target as HTMLSelectElement).value === '4' ? 4 : 2
}
function execute(action: JsonAction) {
  if (composing.value || processing.value) return
  invalidate()
  processing.value = true
  try {
    result.value = processJson({ input: input.value, action, indent: indent.value })
    if (result.value.status === 'validated') message.value = 'JSON 语法合法；语法合法不代表数字精度安全。'
    else if (result.value.status === 'converted') message.value = action === 'format' ? '已格式化，请留意数字精度与重复键提示。' : '已压缩，请留意数字精度与重复键提示。'
  } catch { result.value = { status: 'error', code: 'unexpected' } }
  finally { processing.value = false }
}
function fillExample() {
  if (input.value !== '' || composing.value) return
  invalidate()
  input.value = '{"name":"WorkDev Tools","enabled":true,"items":[1,"你好",null]}'
  message.value = '已填入示例，请选择操作。'
  editor.value?.focus()
}
function clear() {
  if (composing.value) return
  invalidate()
  input.value = ''
  indent.value = 2
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
  <div class="json-tool">
    <div id="json-rules" class="rules">
      <p>JSON 语法校验支持对象、数组、字符串、数字、布尔值和 null；校验成功不代表转换可以安全执行。</p>
      <p>重复属性名仅保留最后一个值；转换可能改变数字精度和原始写法，请保留原文。格式化不是无损文本编辑。</p>
      <p>转换拒绝最终值中的不安全整数及非有限数。有限小数可能舍入或下溢，科学计数法、尾随零和负零可能变化；需要精确数字时，请在原数据中使用字符串。</p>
      <p>最多 100,000 个 UTF-16 码元、100 层嵌套，输出最多 1,000,000 个码元。仅在当前浏览器内存中处理，不上传或保存；刷新或收起工具后清空。</p>
    </div>
    <div class="workspace">
    <div class="editor-pane">
    <div class="editor-heading">
      <label for="json-input">输入或粘贴 JSON</label>
      <span>{{ input.length.toLocaleString('zh-CN') }} / {{ JSON_INPUT_LIMIT.toLocaleString('zh-CN') }} UTF-16 码元</span>
    </div>
    <textarea id="json-input" ref="editor" :value="input" rows="12" aria-describedby="json-rules json-status" :aria-invalid="error ? 'true' : undefined" autocomplete="off" autocapitalize="off" :spellcheck="false" placeholder='例如：{"name":"WorkDev Tools"}' @input="onInput" @compositionstart="onCompositionStart" @compositionend="onCompositionEnd" />
    <div class="actions">
      <label for="json-indent">缩进</label>
      <select id="json-indent" :value="indent" :disabled="composing" @change="changeIndent"><option value="2">2 空格</option><option value="4">4 空格</option></select>
      <button type="button" :disabled="composing || processing || tooLong" @click="execute('validate')">校验语法</button>
      <button type="button" :disabled="composing || processing || tooLong" class="action-primary" @click="execute('format')">格式化</button>
      <button type="button" :disabled="composing || processing || tooLong" @click="execute('minify')">压缩</button>
      <button type="button" :disabled="input !== '' || composing" class="action-quiet" @click="fillExample">填入示例</button>
      <button type="button" :disabled="initial || composing" class="action-quiet" @click="clear">清空</button>
    </div>
    <p id="json-status" class="status" role="status" aria-live="polite" aria-atomic="true">{{ status }}</p>
    </div>
    <div class="output-pane">
    <div class="editor-heading"><label for="json-output">处理结果（只读）</label></div>
    <textarea id="json-output" ref="outputEditor" :value="output" rows="12" readonly aria-describedby="json-rules json-status" :spellcheck="false" autocomplete="off" />
    <div class="actions"><button type="button" :disabled="!output || copying || composing" @click="copyResult">{{ copying ? '复制中…' : '复制结果' }}</button></div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.json-tool { margin-top: var(--space-5); min-width: 0; }
.rules { color: var(--color-muted); font-size: 0.875rem; margin-bottom: var(--space-5); }
.rules p + p { margin-top: var(--space-3); }
.editor-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-3); }
.editor-heading span { color: var(--color-muted); font-size: 0.875rem; }
label { font-weight: 650; }
textarea { display: block; width: 100%; max-width: 100%; min-width: 0; padding: var(--space-4); resize: vertical; border: 1px solid var(--color-border); border-radius: var(--radius-small); background: var(--color-surface); color: var(--color-text); font: inherit; overflow-wrap: anywhere; }
#json-output { margin-top: var(--space-3); }
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
#json-output { margin-top: 0; }
.output-pane > .editor-heading { min-height: 27px; }
</style>
