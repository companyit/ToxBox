<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { fileReadStatus } from '@/utils/fileReadStatus'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import LocalToolEditor from '@/components/tools/LocalToolEditor.vue'
import { convertNdjson, validateNdjson, NDJSON_TEXT_LIMIT, type NdjsonArrayFormat, type NdjsonDirection } from '@/utils/ndjson'

const direction = ref<NdjsonDirection | 'validate'>('to-array')
const format = ref<NdjsonArrayFormat>('compact')
const canConvertValidated = ref(false)
const validating = computed(() => direction.value === 'validate')
const ndjsonInput = computed(() => direction.value !== 'to-lines')
function transform(input: string) {
  if (direction.value === 'validate') {
    const { report, message, valid } = validateNdjson(input)
    canConvertValidated.value = valid
    return { output: report, message }
  }
  const { output, count } = convertNdjson(input, direction.value, format.value)
  return { output, message: `已转换 ${count} 条记录。` }
}

const fileInput = ref<HTMLInputElement>()
const pickerButton = ref<HTMLButtonElement>()
const reading = ref(false)
const fileStatus = ref('')
const downloadStatus = ref('')
const accept = computed(() => ndjsonInput.value ? '.ndjson,.jsonl' : '.json')
const fileLimit = 600_000
let reader: FileReader | undefined
let readTimer: ReturnType<typeof setTimeout> | undefined
let downloadUrl: string | undefined

function stopRead() {
  const pending = reader
  reader = undefined
  clearTimeout(readTimer)
  readTimer = undefined
  reading.value = false
  pending?.abort()
}

function cancelRead() {
  stopRead()
  fileStatus.value = fileReadStatus.canceled
  pickerButton.value?.focus()
}

function resetOutputActions() {
  canConvertValidated.value = false
  if (downloadUrl) URL.revokeObjectURL(downloadUrl)
  downloadUrl = undefined
  downloadStatus.value = ''
}

function invalidate() {
  resetOutputActions()
  stopRead()
  fileStatus.value = ''
}

function importFile(event: Event, setInput: (value: string) => void) {
  const control = event.target as HTMLInputElement
  const file = control.files?.[0]
  control.value = ''
  if (!file) return
  stopRead()
  const validExtension = ndjsonInput.value ? /\.(ndjson|jsonl)$/i : /\.json$/i
  if (!validExtension.test(file.name)) {
    fileStatus.value = ndjsonInput.value ? '请选择 .ndjson 或 .jsonl 文件。' + fileReadStatus.retained : '请选择 .json 文件。' + fileReadStatus.retained
    return
  }
  if (file.size > fileLimit) {
    fileStatus.value = '文件最多 600,000 字节。' + fileReadStatus.retained
    return
  }

  const active = new FileReader()
  reader = active
  reading.value = true
  fileStatus.value = fileReadStatus.reading
  const fail = (message: string) => {
    if (reader !== active) return
    stopRead()
    fileStatus.value = message
  }
  readTimer = setTimeout(() => fail(fileReadStatus.timeout), 10_000)
  active.onerror = () => fail(fileReadStatus.failed)
  active.onload = () => {
    if (reader !== active) return
    const bytes = active.result as ArrayBuffer
    stopRead()
    let text: string
    try {
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
    } catch {
      fileStatus.value = '文件不是有效的 UTF-8。' + fileReadStatus.retained
      return
    }
    if (text.length > NDJSON_TEXT_LIMIT) {
      fileStatus.value = '解码后超过 200,000 个码元。' + fileReadStatus.retained
      return
    }
    setInput(text)
    fileStatus.value = validating.value ? '文件已载入，可编辑后逐行校验。' : '文件已载入，可编辑后点击转换。'
  }
  try {
    active.readAsArrayBuffer(file)
  } catch {
    fail(fileReadStatus.failed)
  }
}

async function convertValidated(run: () => void) {
  if (!validating.value || !canConvertValidated.value) return
  direction.value = 'to-array'
  await nextTick()
  if (direction.value === 'to-array') run()
}

function download(output: string) {
  const toArray = direction.value === 'to-array'
  const type = toArray ? 'application/json;charset=utf-8' : 'application/x-ndjson;charset=utf-8'
  const link = document.createElement('a')
  try {
    downloadUrl ??= URL.createObjectURL(new Blob([output], { type }))
    link.href = downloadUrl
    link.download = toArray ? 'converted.json' : 'converted.ndjson'
    link.hidden = true
    document.body.append(link)
    link.click()
    downloadStatus.value = '已请求浏览器下载。'
  } catch {
    downloadStatus.value = '无法启动下载，请重试。'
  } finally {
    link.remove()
  }
}

onMounted(() => window.addEventListener('pagehide', invalidate))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', invalidate)
  invalidate()
})
</script>

<template>
  <ToolPageLayout page-name="ndjson">
    <LocalToolEditor
      workspace
      :label="ndjsonInput ? '输入 NDJSON' : '输入 JSON 数组'"
      rules="最多 2,000 条记录、每行 50,000 码元，输入和输出各最多 200,000 码元。保留数字精度。"
      :input-hint="ndjsonInput ? '每个非空行填写一个 JSON 值。' : '粘贴一个 JSON 数组。每个元素转换为一行。'"
      :result-context="validating ? '校验报告' : ndjsonInput ? 'JSON 数组' : 'NDJSON'"
      :action-label="validating ? '逐行校验' : undefined"
      :example="ndjsonInput ? '{&quot;id&quot;:9007199254740993}\n{&quot;id&quot;:2}' : '[{&quot;id&quot;:9007199254740993},{&quot;id&quot;:2}]'"
      :limit="NDJSON_TEXT_LIMIT"
      :revision-key="validating ? direction : `${direction}/${format}`"
      :transform="transform"
      @invalidate="invalidate"
      @run="resetOutputActions"
    >
      <div class="direction-field">
        <label for="ndjson-direction">处理方式</label>
        <select id="ndjson-direction" v-model="direction">
          <option value="to-array">NDJSON 转 JSON 数组</option>
          <option value="to-lines">JSON 数组转 NDJSON</option>
          <option value="validate">逐行校验 NDJSON</option>
        </select>
      </div>
      <div v-if="ndjsonInput" class="direction-field">
        <label for="ndjson-array-format">数组输出排版</label>
        <select id="ndjson-array-format" v-model="format">
          <option value="compact">紧凑</option>
          <option value="pretty">易读（2 空格）</option>
        </select>
      </div>
      <template #after-input="{ setInput }">
        <div class="file-field">
          <input id="ndjson-file" ref="fileInput" type="file" hidden :accept="accept"
            aria-label="导入本地文件" @change="importFile($event, setInput)" />
          <div class="file-read-actions">
            <button ref="pickerButton" type="button" class="transfer-button" aria-describedby="ndjson-file-help ndjson-file-status"
              @click="fileInput?.click()">导入本地文件</button>
            <button v-if="reading" type="button" class="transfer-button" @click="cancelRead">取消读取</button>
          </div>
          <p id="ndjson-file-help" class="file-read-limits">UTF-8，{{ accept === '.json' ? '.json' : '.ndjson 或 .jsonl' }}，每份最多 600,000 字节，解码后最多 200,000 个 UTF-16 码元。</p>
          <p id="ndjson-file-status" class="transfer-status" role="status">{{ fileStatus }}</p>
        </div>
      </template>
      <template #result-actions="{ output, hasOutput, run }">
        <button v-if="validating && canConvertValidated && hasOutput" type="button" class="transfer-button"
          @click="convertValidated(run)">转为 JSON 数组</button>
        <button v-if="!validating" type="button" class="transfer-button" :disabled="!hasOutput" @click="download(output)">下载结果</button>
        <p v-if="downloadStatus" class="transfer-status" role="status">{{ downloadStatus }}</p>
      </template>
    </LocalToolEditor>
  </ToolPageLayout>
</template>

<style scoped>
.direction-field { display: grid; gap: 10px; justify-items: start; min-width: 0; }
.file-field { display: grid; align-content: start; justify-items: start; gap: 8px; min-width: 0; }
.file-field p, .transfer-status { margin: 0; color: var(--color-muted); }
.transfer-button {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--ui-control-radius);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  justify-self: start;
}
.transfer-button:not(:disabled):hover { border-color: var(--color-accent); }
.transfer-button:disabled { opacity: .6; }
</style>
