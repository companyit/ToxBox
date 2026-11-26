<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { convertTable, tableErrors, type CsvOutput, type TableDirection, type TableError } from '@/utils/csvJson'
import { jsonTableNotices, type JsonTableNotice } from '@/utils/jsonTable'

const direction = ref<TableDirection>('csv-to-json'), input = ref(''), output = ref('')
const hasResult = ref(false)
const downloadName = computed(() => direction.value === 'csv-to-json' ? 'converted.json' : 'converted.csv')
let downloadUrl = ''
function releaseDownload() { if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = '' }
const message = ref(''), error = ref(''), dimensions = ref(''), composing = ref(false), copying = ref(false)
const jsonMode = ref<'compatible' | 'strict'>('compatible'), recordPath = ref(''), notices = ref<JsonTableNotice[]>([]), format = ref(''), errorCode = ref<TableError | ''>('')
const csvOutput = ref<CsvOutput>('matrix')
const recordScope = ref<'root' | 'each'>('root'), flattenObjects = ref(false)
const jsonExamples = {
  objects: { label: '对象数组：自动表头与不同字段', input: JSON.stringify([{ id: '001', name: '甲', active: true, tags: ['A', 'B'], profile: { city: '上海' }, note: null }, { id: '002', name: '乙', score: 98.5 }], null, 2), path: '' },
  object: { label: '单个对象：嵌套信息保留', input: JSON.stringify({ name: '甲', active: true, address: { city: '上海' }, tags: ['A', 'B'], note: null }, null, 2), path: '' },
  matrix: { label: '二维数组：混合类型与大整数', input: '[[9007199254740993, true, null], ["001", {"city":"上海"}]]', path: '' },
  values: { label: '混合数组：value 单列保留', input: '["001", 9007199254740993, true, null, {"name":"甲"}, [1,2]]', path: '' },
  wrapped: { label: '接口对象数组：逐条提取 data 并展开', input: JSON.stringify(Array.from({ length: 2 }, () => ({ code: 200, message: '操作成功', data: { id: 1001, name: '示例名称', isActive: true, score: 95.5, tags: ['标签一', '标签二', '标签三'], profile: { email: 'example@domain.com', phone: '13800138000' }, createdAt: '2026-11-14T08:00:00Z' } })), null, 2), path: '/data' },
  response: { label: '接口返回：选择 /data/items', input: JSON.stringify({ code: 0, data: { items: [{ id: '001', name: '甲' }, { id: '002', name: '乙', active: false }] } }, null, 2), path: '/data/items' },
}
const exampleKind = ref<keyof typeof jsonExamples>('objects')
const editor = ref<HTMLTextAreaElement>(), resultEditor = ref<HTMLTextAreaElement>()
const rules = computed(() => direction.value === 'csv-to-json'
  ? '英文逗号分隔；引号字段可含逗号或换行，字段内双引号写成两个双引号。闭引号后仅允许逗号、换行或结束，不自动 trim。' + (csvOutput.value === 'objects' ? '首行作为字段名，不能空白或重复；字段名不去除前后空白。值全部保留为字符串，字段文本顺序不作保证。' : '首行是普通数据，单元格全部保留为字符串。') + ''
  : '支持对象数组、单个对象、二维混合类型数组和基本值。对象按字段首次出现顺序合并表头，缺失字段/短行补空；普通或混合数组使用 value 单列。数字保留原始精度，布尔值写成 true/false，null 写成 null；嵌套内容默认保留为 JSON 文本，可选择展开对象为独立列，数组仍保留 JSON 文本。CSV 不保存 JSON 类型。所有字段加双引号，记录用 LF 分隔；[] 得到空结果。')
let version = 0, disposed = false
function invalidate() { releaseDownload(); hasResult.value = false; version++; output.value = ''; dimensions.value = ''; message.value = ''; error.value = ''; errorCode.value = ''; notices.value = []; format.value = '' }
watch([input, direction, jsonMode, recordPath, recordScope, flattenObjects, csvOutput], invalidate, { flush: 'sync' })
function run() {
  if (composing.value) return
  invalidate()
  const result = convertTable(input.value, direction.value, { csvOutput: csvOutput.value, jsonMode: jsonMode.value, recordPath: recordPath.value, recordScope: recordScope.value, flattenObjects: flattenObjects.value })
  if (result.status === 'empty') message.value = '暂无内容。'
  else if (result.status === 'error') {
    errorCode.value = result.code
    error.value = (result.line ? `第 ${result.line} 行，第 ${result.column} 列：` : '') + tableErrors[result.code]
  }
  else {
    hasResult.value = true
    output.value = result.output
    dimensions.value = `${result.rows} 条记录，${result.columns} 列。`
    message.value = result.output ? '转换完成。' : '结果为空。'
    notices.value = result.notices ?? []
    const formats = { matrix: '', objects: '对象数组；CSV 包含表头，记录统计不含表头。', object: '单个对象；CSV 包含表头。', values: '单列数组；CSV 包含 value 表头。', value: '单个值；CSV 包含 value 表头。' }
    format.value = result.format ? formats[result.format] : ''
  }
}
function releaseContent() { composing.value = false; csvOutput.value = 'matrix'; input.value = ''; direction.value = 'csv-to-json'; jsonMode.value = 'compatible'; recordPath.value = ''; recordScope.value = 'root'; flattenObjects.value = false; exampleKind.value = 'objects'; invalidate() }
function clear() { if (composing.value) return; releaseContent(); editor.value?.focus() }
function example() {
  if (composing.value) return
  if (input.value) { error.value = ''; errorCode.value = ''; message.value = '请先清空现有输入，再填入示例。'; return }
  if (direction.value === 'csv-to-json') input.value = (csvOutput.value === 'objects' ? 'id,name\n' : '') + '001,"甲,乙"\n002,"他说""好"""'
  else {
    const sample = jsonExamples[exampleKind.value]
    recordPath.value = sample.path; recordScope.value = exampleKind.value === 'wrapped' ? 'each' : 'root'; flattenObjects.value = exampleKind.value === 'wrapped'; input.value = sample.input
  }
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
function downloadResult() {
  if (!hasResult.value || composing.value) return
  let link: HTMLAnchorElement | undefined
  try {
    if (!downloadUrl) {
      const type = direction.value === 'csv-to-json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8'
      downloadUrl = URL.createObjectURL(new Blob([output.value], { type }))
    }
    link = document.createElement('a')
    link.href = downloadUrl; link.download = downloadName.value; link.hidden = true
    document.body.append(link); link.click()
    message.value = '已请求浏览器下载，请确认实际保存。'
  } catch {
    releaseDownload()
    message.value = '无法启动下载，请重试或复制结果后保存。'
  } finally { link?.remove() }
}
function compositionStart() { composing.value = true; invalidate() }
onMounted(() => window.addEventListener('pagehide', releaseContent))
onBeforeUnmount(() => { disposed = true; window.removeEventListener('pagehide', releaseContent); releaseContent() })
</script>

<template>
  <ToolPageLayout page-name="csv-json">
    <div class="table-tool">
      <p id="table-rules">{{ rules }}</p>
      <p id="table-limits">输入最多 100,000、结果最多 1,000,000 个 UTF-16 码元，最多 1,000 条数据记录、100 列，不截断。JSON 嵌套最多 30 层、50,000 个节点。实际 CSV 字段中的 CRLF、CR 统一为 LF；嵌套 JSON 文本保留内部转义。CSV 只移除开头一个 BOM，空行保留，末尾单个换行不增加记录。不接受空字符或孤立代理项。内容仅在当前页面内存中处理，不上传或自动保存。</p>
      <label for="table-direction">转换方向</label>
      <select id="table-direction" v-model="direction" :disabled="composing" aria-describedby="table-rules">
        <option value="csv-to-json">CSV → JSON</option>
        <option value="json-to-csv">JSON → CSV</option>
      </select>
      <fieldset v-if="direction === 'csv-to-json'" class="json-options">
        <legend>CSV 输出选项</legend>
        <label for="table-csv-output">JSON 输出格式</label>
        <select id="table-csv-output" v-model="csvOutput" :disabled="composing" aria-describedby="table-csv-help">
          <option value="matrix">二维字符串数组（保留首行）</option>
          <option value="objects">对象数组（首行作字段名）</option>
        </select>
        <p id="table-csv-help">对象模式的记录统计不含表头，最多 1,000 条数据记录；二维模式最多 1,000 条总记录。不推断数字、布尔或日期类型；只有表头时输出 []。</p>
      </fieldset>
      <fieldset v-if="direction === 'json-to-csv'" class="json-options">
        <legend>JSON 输入选项</legend>
        <label for="table-json-mode">JSON 解析方式</label>
        <select id="table-json-mode" v-model="jsonMode" :disabled="composing" aria-describedby="table-json-help">
          <option value="compatible">兼容模式：BOM、注释、尾随逗号</option>
          <option value="strict">严格 JSON 语法</option>
        </select>
        <p id="table-json-help">兼容处理会明确提示，不修改原输入。不猜测单引号、裸键或缺失值，也不覆盖重复字段。可选择下方完整示例，再点击“填入示例”。</p>
        <label for="table-nested-mode">嵌套对象处理</label>
        <select id="table-nested-mode" v-model="flattenObjects" :disabled="composing" aria-describedby="table-nested-help">
          <option :value="false">保留为 JSON 文本</option>
          <option :value="true">展开为独立列</option>
        </select>
        <p id="table-nested-help">展开仅用于对象记录，例如 data.profile.email；数组和空对象保留为 JSON 文本。字段名中的点以反斜杠转义，反斜杠写成两个，避免不同路径混淆。</p>
        <label for="table-record-scope">路径作用范围</label>
        <select id="table-record-scope" v-model="recordScope" :disabled="composing" aria-describedby="table-path-help">
          <option value="root">从整个 JSON 选择</option>
          <option value="each">从数组每条对象记录选择</option>
        </select>
        <label for="table-record-path">记录路径（可选）</label>
        <input id="table-record-path" v-model="recordPath" type="text" autocomplete="off" :spellcheck="false" placeholder="例如 /data/items，留空使用根数据" :aria-invalid="errorCode === 'record-path'" aria-describedby="table-path-help table-status" @compositionstart="compositionStart" @compositionend="composing = false" />
        <p id="table-path-help">接口数据可用 /data 或 /data/items 选择记录；路径中的 ~0 表示 ~，~1 表示 /。逐条模式可用 /data 提取数组中每条记录的对象；每条都必须存在该路径且结果为对象，否则整次报错。不会自动猜测或删除包装字段，路径最多 1,000 个码元。</p>
        <label for="table-json-example">JSON 示例格式</label>
        <select id="table-json-example" v-model="exampleKind" :disabled="composing">
          <option v-for="(sample, key) in jsonExamples" :key="key" :value="key">{{ sample.label }}</option>
        </select>
      </fieldset>
      <label for="table-input">待转换的表格文本</label>
      <textarea id="table-input" ref="editor" v-model="input" rows="9" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error && errorCode !== 'record-path'" aria-describedby="table-rules table-limits table-status" @compositionstart="compositionStart" @compositionend="composing = false" />
      <div class="actions">
        <button type="button" :disabled="composing" @click="run">转换表格</button>
        <button type="button" :disabled="composing" @click="example">填入示例</button>
        <button type="button" :disabled="composing" @click="clear">清空</button>
      </div>
      <div id="table-status" role="status" aria-live="polite">
        <p>{{ error || message }} {{ dimensions }}</p>
        <p v-if="format">识别格式：{{ format }}</p>
        <ul v-if="notices.length" aria-label="转换兼容提示"><li v-for="notice in notices" :key="notice">{{ jsonTableNotices[notice] }}</li></ul>
      </div>
      <label for="table-result">表格结果（只读）</label>
      <textarea id="table-result" ref="resultEditor" :value="output" readonly rows="9" :spellcheck="false" aria-describedby="table-status" />
      <div class="actions">
        <button type="button" :disabled="!output || copying || composing" @click="copy">复制结果</button>
        <button type="button" :disabled="!hasResult || composing" aria-describedby="table-download-note" @click="downloadResult">{{ direction === 'csv-to-json' ? '下载 JSON' : '下载 CSV' }}</button>
      </div>
      <p id="table-download-note">下载为 UTF-8 文件，不额外添加 BOM 或换行，内容与结果框一致；空 CSV 结果保存为零字节文件。文件仅在本地生成，是否保存由浏览器和系统处理。</p>
    </div>
  </ToolPageLayout>
</template>

<style scoped>
.table-tool { display: grid; gap: 12px; min-width: 0; margin-block: 24px; }
p { color: var(--color-muted); overflow-wrap: anywhere; line-height: 1.7; }
label { font-weight: 650; }
textarea, input, select, button { box-sizing: border-box; max-width: 100%; min-width: 0; border: 1px solid var(--color-control-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; }
textarea { width: 100%; padding: 16px; resize: vertical; font-family: ui-monospace, monospace; line-height: 1.6; }
button, select { min-height: 44px; padding: 8px 16px; }
input { width: 100%; min-height: 44px; padding: 8px 16px; }
.json-options { display: grid; gap: 12px; min-width: 0; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); }
legend { padding-inline: 4px; font-weight: 650; }
button { justify-self: start; cursor: pointer; }
button:disabled, select:disabled { opacity: .6; cursor: default; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }
textarea:focus-visible, input:focus-visible, button:focus-visible, select:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
[role=status] { min-height: 1.7em; }
</style>
