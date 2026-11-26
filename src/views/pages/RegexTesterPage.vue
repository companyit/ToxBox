<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { regexFlags, validateRegexInput, type RegexFlag, type RegexRequest, type RegexResult } from '@/utils/regexTester'

const flagLabels = { i: '忽略大小写', m: '多行', s: '点号匹配换行', u: 'Unicode' }
const pattern = ref('')
const sample = ref('')
const flags = ref<RegexFlag[]>([])
const patternEditor = ref<HTMLTextAreaElement>()
const busy = ref(false)
const composing = ref(false)
const error = ref('')
const message = ref('')
const result = ref<Extract<RegexResult, { matches: unknown }>>()
const page = ref(1)
const pageSize = 50
const pageCount = computed(() => Math.ceil((result.value?.matches.length ?? 0) / pageSize))
const offset = computed(() => (page.value - 1) * pageSize)
const rows = computed(() => result.value?.matches.slice(offset.value, offset.value + pageSize) ?? [])
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined

function reset() {
  worker?.terminate()
  worker = undefined
  clearTimeout(timer)
  timer = undefined
  busy.value = false
  error.value = ''
  message.value = ''
  result.value = undefined
  page.value = 1
}

watch([pattern, sample, flags], reset, { flush: 'sync' })

function run() {
  if (composing.value) return
  reset()
  const request: RegexRequest = { pattern: pattern.value, sample: sample.value, flags: [...flags.value] }
  const invalid = validateRegexInput(request)
  if (invalid) {
    error.value = invalid
    return
  }

  const timeoutMessage = '匹配超过 2 秒，已停止。'
  try {
    const activeWorker = new Worker(new URL('../../workers/regexTester.worker.ts', import.meta.url), { type: 'module' })
    worker = activeWorker
    busy.value = true
    const deadline = performance.now() + 2_000
    timer = setTimeout(() => {
      if (worker !== activeWorker) return
      reset()
      error.value = timeoutMessage
    }, 2_000)
    activeWorker.onmessage = (event: MessageEvent<RegexResult>) => {
      if (worker !== activeWorker) return
      reset()
      if (performance.now() > deadline) error.value = timeoutMessage
      else if ('error' in event.data) error.value = event.data.error
      else result.value = event.data
    }
    activeWorker.onerror = event => {
      event.preventDefault()
      if (worker !== activeWorker) return
      reset()
      error.value = '无法运行正则测试，请重试。'
    }
    activeWorker.postMessage(request)
  } catch {
    reset()
    error.value = '无法运行正则测试，请重试。'
  }
}

function cancel() {
  reset()
  message.value = '已取消匹配。'
}

function release() {
  pattern.value = ''
  sample.value = ''
  flags.value = []
  composing.value = false
  reset()
}

function clear() {
  release()
  patternEditor.value?.focus()
}

function startComposition() {
  composing.value = true
  reset()
}

onMounted(() => window.addEventListener('pagehide', release))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', release)
  release()
})
</script>

<template>
  <ToolPageLayout page-name="regex-tester">
    <section class="regex-tool" aria-label="正则表达式测试操作">
      <div class="regex-editors">
        <div class="regex-field">
          <label for="regex-pattern">正则表达式</label>
          <textarea id="regex-pattern" ref="patternEditor" v-model="pattern" rows="4" autocomplete="off"
            autocapitalize="off" :spellcheck="false" aria-describedby="regex-help"
            @compositionstart="startComposition" @compositionend="composing = false" />
          <p id="regex-help">直接输入 JavaScript 正则模式，最多 1,000 个码元。标志在下方选择。</p>
          <fieldset>
            <legend>匹配标志</legend>
            <div class="actions">
              <label v-for="flag in regexFlags" :key="flag">
                <input v-model="flags" type="checkbox" :value="flag" /> {{ flag }} · {{ flagLabels[flag] }}
              </label>
            </div>
          </fieldset>
        </div>
        <div class="regex-field">
          <label for="regex-sample">样本文本</label>
          <textarea id="regex-sample" v-model="sample" rows="7" autocomplete="off" autocapitalize="off"
            :spellcheck="false" aria-describedby="regex-sample-help"
            @compositionstart="startComposition" @compositionend="composing = false" />
          <p id="regex-sample-help">最多 50,000 个码元。匹配在浏览器本地执行，超过 2 秒自动停止。</p>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="primary" :disabled="composing" @click="run">
          {{ busy ? '重新测试' : '测试匹配' }}
        </button>
        <button type="button" :aria-disabled="!busy" @click="busy && cancel()">取消</button>
        <button type="button" @click="clear">清空</button>
      </div>
      <p id="regex-status" role="status">
        <template v-if="error">{{ error }}</template>
        <template v-else-if="busy">正在匹配…</template>
        <template v-else-if="message">{{ message }}</template>
        <template v-else-if="result && rows.length">
          {{ result.limited ? '仅预览前 500 项。' : `共 ${result.matches.length} 项匹配。` }}
          第 {{ page }} / {{ pageCount }} 页。
        </template>
        <template v-else-if="result">未找到匹配。</template>
      </p>
      <section v-if="rows.length" class="matches" aria-labelledby="regex-results">
        <h2 id="regex-results">匹配结果</h2>
        <p>位置以 UTF-16 码元计数，从 0 开始，结束位置不含。</p>
        <nav v-if="pageCount > 1" class="actions" aria-label="匹配结果分页">
          <button type="button" :aria-disabled="page === 1" @click="page = Math.max(1, page - 1)">上一页</button>
          <button type="button" :aria-disabled="page === pageCount" @click="page = Math.min(pageCount, page + 1)">下一页</button>
        </nav>
        <ol :start="offset + 1">
          <li v-for="(row, index) in rows" :key="offset + index">
            <p>位置 {{ row.start }} 至 {{ row.end }}</p>
            <code v-if="row.text">{{ row.text }}</code><span v-else>空匹配</span>
            <dl v-if="row.captures.length">
              <div v-for="(capture, group) in row.captures" :key="group">
                <dt>{{ capture.label }}</dt>
                <dd>
                  <code v-if="capture.value">{{ capture.value }}</code>
                  <span v-else>{{ capture.value === undefined ? '未参与匹配' : '空字符串' }}</span>
                </dd>
              </div>
            </dl>
          </li>
        </ol>
      </section>
    </section>
  </ToolPageLayout>
</template>

<style scoped>
.regex-tool, .matches, .regex-editors, .regex-field { display: grid; gap: 12px; min-width: 0; }
.regex-tool {
  padding: clamp(12px, 3vw, 24px);
  border: 1px solid var(--color-border);
  border-radius: var(--ui-card-radius, 20px);
  background: var(--color-surface);
}
.regex-field { align-content: start; }
.regex-editors { grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr)); }
.matches { padding-top: 16px; border-top: 1px solid var(--color-border); }
.matches h2 { font-size: 1.25rem; }
label, legend { font-weight: 650; }
p { margin: 0; color: var(--color-muted); }
#regex-status { min-height: 1.5em; }
fieldset { border-radius: var(--ui-control-radius); min-width: 0; padding: 8px 12px; border: 1px solid var(--color-control-border); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
textarea, button {
  box-sizing: border-box;
  max-width: 100%;
  min-height: 44px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--ui-control-radius);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 8px 12px;
  font: inherit;
}
textarea { width: 100%; resize: vertical; font-family: ui-monospace, monospace; }
textarea:focus-visible, input:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
.primary { background: var(--color-accent); color: var(--color-on-accent); font-weight: 650; }
button:disabled, button[aria-disabled="true"] { opacity: .6; }
ol { padding-inline-start: 2rem; margin: 0; }
li { padding-block: 8px; border-bottom: 1px solid var(--color-control-border); }
dl { margin-block: 8px 0; }
dl > div { display: grid; grid-template-columns: minmax(0, 8rem) minmax(0, 1fr); gap: 8px; }
dd { margin: 0; }
dt, code { overflow-wrap: anywhere; }
code { white-space: pre-wrap; unicode-bidi: plaintext; }
</style>
