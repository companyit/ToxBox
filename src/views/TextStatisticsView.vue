<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { analyzeText, TEXT_CODE_UNIT_LIMIT } from '@/utils/textStatistics'
import type { TextAnalysis, TextStatistics } from '@/types/textStatistics'

const editor = ref<HTMLTextAreaElement | null>(null)
const text = ref('')
const composing = ref(false)
const analysis = ref<TextAnalysis | null>(analyzeText(''))
const calculationError = ref(false)
const message = ref('')
const copying = ref(false)
let revision = 0
let disposed = false

const fields: readonly { key: keyof TextStatistics; label: string }[] = [
  { key: 'characterCount', label: '字符总数' },
  { key: 'nonWhitespaceCharacterCount', label: '去空白字符数' },
  { key: 'segmentCount', label: '词段数（按空白分隔）' },
  { key: 'lineCount', label: '总行数' },
  { key: 'nonEmptyLineCount', label: '非空行数' },
]
const tooLong = computed(() => text.value.length > TEXT_CODE_UNIT_LIMIT)
const error = computed(() => tooLong.value
  ? `输入超过 ${TEXT_CODE_UNIT_LIMIT.toLocaleString()} 个 UTF-16 码元，原文本已保留，请缩短后继续统计。`
  : calculationError.value ? '暂时无法统计，原文本已保留，请修改文本后重试。' : '')
const status = computed(() => [error.value, composing.value ? '输入中，完成后更新统计。' : message.value].filter(Boolean).join(' '))
const statistics = computed(() => !composing.value && !tooLong.value && analysis.value?.status === 'ok'
  ? analysis.value.statistics : null)

function calculate() {
  calculationError.value = false
  try {
    analysis.value = analyzeText(text.value)
  } catch {
    analysis.value = null
    calculationError.value = true
  }
}
function updateText(value: string) {
  revision++
  message.value = ''
  text.value = value
  calculationError.value = false
  if (composing.value) analysis.value = null
  else calculate()
}
function onInput(event: Event) {
  updateText((event.target as HTMLTextAreaElement).value)
}
function onCompositionStart() {
  revision++
  message.value = ''
  composing.value = true
  analysis.value = null
}
function onCompositionEnd(event: CompositionEvent) {
  composing.value = false
  updateText((event.target as HTMLTextAreaElement).value)
}
function clearText() {
  if (composing.value) return
  updateText('')
  message.value = '文本已清空。'
  editor.value?.focus()
}
function fillExample() {
  if (text.value !== '' || composing.value) return
  updateText('你好 world\nVue 3')
  message.value = '已填入示例。'
  editor.value?.focus()
}
async function copyText() {
  if (!text.value || copying.value || composing.value) return
  const copiedRevision = revision
  const snapshot = text.value
  copying.value = true
  message.value = '正在复制…'
  try {
    if (!window.isSecureContext || !navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(snapshot)
    if (!disposed && revision === copiedRevision) message.value = '文本已复制。'
  } catch {
    if (!disposed && revision === copiedRevision) {
      editor.value?.focus()
      editor.value?.select()
      message.value = '无法自动复制，请选中文本后手动复制。'
    }
  } finally {
    if (!disposed) copying.value = false
  }
}
onBeforeUnmount(() => { disposed = true; revision++ })
</script>

<template>
  <div class="text-tool">
    <div class="editor-heading">
      <label for="statistics-input">输入或粘贴文本</label>
      <span>{{ text.length.toLocaleString() }} / {{ TEXT_CODE_UNIT_LIMIT.toLocaleString() }} UTF-16 码元</span>
    </div>
    <textarea
      id="statistics-input"
      ref="editor"
      :value="text"
      rows="12"
      aria-describedby="statistics-rules statistics-status"
      :aria-invalid="error ? 'true' : undefined"
      autocomplete="off"
      autocapitalize="off"
      :spellcheck="false"
      placeholder="在这里输入文本，统计会实时更新。"
      @input="onInput"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />
    <div class="actions">
      <button type="button" :disabled="text !== '' || composing" @click="fillExample">填入示例</button>
      <button type="button" :disabled="!text || copying || composing" @click="copyText">{{ copying ? '复制中…' : '复制文本' }}</button>
      <button type="button" :disabled="!text || composing" @click="clearText">清空</button>
    </div>
    <p id="statistics-status" class="status" role="status" aria-live="polite" aria-atomic="true">{{ status }}</p>
    <dl class="statistics" aria-label="文本统计结果">
      <div v-for="field in fields" :key="field.key">
        <dt>{{ field.label }}</dt>
        <dd>{{ statistics ? statistics[field.key].toLocaleString() : '—' }}</dd>
      </div>
    </dl>
    <div id="statistics-rules" class="rules">
      <p>字符按 Unicode 码点计数，Emoji 组合可能包含多个字符。去空白数排除规定的空格、Tab、换行等空白，不移除零宽连接符。</p>
      <p>词段按空白分隔，不是准确中文分词，也不是自然语言词数。CRLF 算一次换行，末尾空行保留，自动折行不增加行数。</p>
      <p>上限为 100,000 个 UTF-16 码元，与字符数不同。超过上限不截断文本，缩短后自动恢复统计。示例只在输入为空时可填入。</p>
      <p>所有文本仅在当前浏览器内存中处理，不上传或保存；收起工具或刷新页面后清空。</p>
      <details>
        <summary>查看空白与字符计数细则</summary>
        <p>空白集合：U+0009～000D、U+0020、U+00A0、U+1680、U+2000～200A、U+2028、U+2029、U+202F、U+205F、U+3000、U+FEFF。U+0085、U+180E、U+200B、U+200D 不在其中。</p>
        <p>CRLF 的两个码点都计入字符总数；行数只增加一次。LF、CR、U+2028、U+2029 可换行，纯空白行不计入非空行。文本框可能将粘贴换行转换成 LF，统计以实际输入框值为准。</p>
        <p>😀 为 1，👍🏽 为 2，家庭 Emoji 👨‍👩‍👧‍👦 为 7；不做 Unicode 规范化，组合附加符分别计数。</p>
      </details>
    </div>
  </div>
</template>

<style scoped>
.text-tool { margin-top: var(--space-5); }
.editor-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); margin-bottom: var(--space-3); }
label { font-weight: 650; }
.editor-heading span, .rules { color: var(--color-muted); font-size: 0.875rem; }
textarea { display: block; width: 100%; min-width: 0; max-width: 100%; resize: vertical; padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-small); background: var(--color-surface); color: var(--color-text); font: inherit; overflow-wrap: anywhere; }
textarea[aria-invalid="true"] { border-color: var(--color-accent); }
textarea:focus-visible, button:focus-visible, summary:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-4); }
button { min-height: 44px; padding: var(--space-2) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-small); background: var(--color-surface); color: var(--color-accent); font: inherit; font-weight: 600; cursor: pointer; }
button:disabled { color: var(--color-muted); cursor: default; opacity: 0.65; }
.status { min-height: 1.7em; margin-top: var(--space-3); color: var(--color-muted); }
.statistics { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); margin-block: var(--space-5); }
.statistics div { min-width: 0; padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-small); background: var(--color-background); }
dt { color: var(--color-muted); font-size: 0.875rem; }
dd { margin: var(--space-2) 0 0; color: var(--color-text); font-size: 1.75rem; font-weight: 700; overflow-wrap: anywhere; }
.rules p + p, details { margin-top: var(--space-3); }
summary { cursor: pointer; color: var(--color-accent); }
@media (min-width: 640px) { .statistics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .statistics { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
</style>
