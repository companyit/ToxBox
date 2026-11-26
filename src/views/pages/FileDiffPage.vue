<script setup lang="ts">
import {computed,ref,watch,onMounted,onBeforeUnmount,nextTick} from 'vue'
import DiffTable from '@/components/tools/DiffTable.vue'
import { fileReadStatus } from '@/utils/fileReadStatus'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import type { DiffResult } from '@/utils/textDiff'
import {fileDiffLines,fileDiffErrors,fileDiffReport,FILE_DIFF_PAGE,type FileDiffCode} from '@/utils/fileDiff'
import { validateTextFile, fileTextErrors, FileTextError, type FileTextCode } from '@/utils/fileText'
const before=ref(''),after=ref(''),result=ref<DiffResult|null>(null),changesOnly=ref(false),busy=ref(false),composing=ref(false),copying=ref(false),message=ref(''),error=ref('')
const reportEditor=ref<HTMLTextAreaElement>(), report=ref(''), reportOpen=ref(false), page=ref(1)
const pickerButtons=ref<Partial<Record<Side,HTMLButtonElement>>>({})
type Side = 'before' | 'after'
type LoadedFile = { name: string; size: number; lines: number; text: string }
const loaded = ref<Record<Side, LoadedFile | null>>({ before: null, after: null })
const reading = ref<Record<Side, boolean>>({ before: false, after: false })
const fileErrors = ref<Record<Side, string>>({ before: '', after: '' })
const fileInputs = ref<Partial<Record<Side, HTMLInputElement>>>({})
const readers: Partial<Record<Side, Worker>> = {}, readTimers: Partial<Record<Side, ReturnType<typeof setTimeout>>> = {}
const generations = { before: 0, after: 0 }
const loading = computed(() => reading.value.before || reading.value.after)
function stopRead(side: Side) {
  generations[side]++; readers[side]?.terminate(); delete readers[side]
  clearTimeout(readTimers[side]); delete readTimers[side]; reading.value[side] = false
}
function cancelRead(side: Side) { stopRead(side); fileErrors.value[side] = fileReadStatus.canceled; pickerButtons.value[side]?.focus() }
function chooseFile(event: Event, side: Side) {
  const control = event.target as HTMLInputElement, file = control.files?.[0]
  control.value = ''
  if (!file) return
  stopRead(side); invalidate(); fileErrors.value[side] = ''
  try { validateTextFile(file.name, file.size) }
  catch (failure) { fileErrors.value[side] = (failure instanceof FileTextError && failure.code !== 'failed' ? fileTextErrors[failure.code] + fileReadStatus.retained : fileReadStatus.failed); return }
  const generation = generations[side]
  const fail = (text: string) => { if (generation !== generations[side]) return; stopRead(side); fileErrors.value[side] = text }
  try {
    const reader = new Worker(new URL('../../workers/fileText.worker.ts', import.meta.url), { type: 'module' })
    readers[side] = reader; reading.value[side] = true
    readTimers[side] = setTimeout(() => fail(fileReadStatus.timeout), 10000)
    reader.onerror = () => fail(fileReadStatus.failed)
    reader.onmessage = event => {
      if (generation !== generations[side]) return
      const data = event.data
      if (!data.ok) { fail(data.code === 'failed' || !fileTextErrors[data.code as FileTextCode] ? fileReadStatus.failed : fileTextErrors[data.code as FileTextCode] + fileReadStatus.retained); return }
      stopRead(side)
      loaded.value[side] = { name: file.name, size: file.size, lines: data.lines, text: data.text }
      if (side === 'before') before.value = data.text; else after.value = data.text
    }
    reader.postMessage({ file })
  } catch { fail(fileReadStatus.failed) }
}
const visibleRows=computed(()=>result.value?.rows.filter(row=>!changesOnly.value||row.kind!=='same')??[])
const pages=computed(()=>Math.max(1,Math.ceil(visibleRows.value.length/FILE_DIFF_PAGE)))
const pageRows=computed(()=>visibleRows.value.slice((page.value-1)*FILE_DIFF_PAGE,page.value*FILE_DIFF_PAGE))
function resetReport(){report.value='';reportOpen.value=false}
function prepareReport(){
 if(!result.value)return false
 try{report.value=fileDiffReport(result.value,changesOnly.value);reportOpen.value=true;error.value='';return true}
 catch{resetReport();error.value=fileDiffErrors.report;return false}
}
function toggleReport(){if(reportOpen.value){reportOpen.value=false;return};prepareReport()}
let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,version=0,disposed=false
function invalidate(){version++;worker?.terminate();worker=undefined;clearTimeout(timer);busy.value=false;result.value=null;page.value=1;resetReport();message.value='';error.value=''}
watch([before,after],invalidate,{flush:'sync'})
watch(changesOnly,()=>{page.value=1;resetReport();if(result.value){version++;message.value='';error.value=''}},{flush:'sync'})
function cancel(){invalidate();message.value='已取消，请调整文本后重试。'}
function run(){
 if(loading.value || !loaded.value.before || !loaded.value.after)return
 invalidate()
 try{fileDiffLines(before.value);fileDiffLines(after.value)}catch(e){error.value=fileDiffErrors[(e as {code:FileDiffCode}).code]??fileDiffErrors.failed;return}
 const revision=version;busy.value=true;message.value='正在对比…'
 try{
  worker=new Worker(new URL('../../workers/fileDiff.worker.ts',import.meta.url),{type:'module'})
  timer=setTimeout(()=>{if(revision===version){invalidate();error.value='对比超过 10 秒，已停止，请减少文本后重试。'}},10000)
  worker.onerror=()=>{if(revision===version){invalidate();error.value=fileDiffErrors.failed}}
  worker.onmessage=event=>{
   if(revision!==version)return
   const data=event.data;invalidate()
   if(!data.ok){error.value=fileDiffErrors[data.code as FileDiffCode]??fileDiffErrors.failed;return}
   result.value=data.result;message.value=result.value!.added||result.value!.removed?'对比完成。':'两段文本在换行规范化后相同。'
  }
  worker.postMessage({before:before.value,after:after.value})
 }catch{invalidate();error.value='当前浏览器无法启动本地对比，请更新浏览器后重试。'}
}
function swap() {
 if (loading.value) return
 const previous = before.value; before.value = after.value; after.value = previous
 const selected = loaded.value.before; loaded.value.before = loaded.value.after; loaded.value.after = selected
 const previousError = fileErrors.value.before; fileErrors.value.before = fileErrors.value.after; fileErrors.value.after = previousError
 invalidate(); message.value = '已交换，请重新对比。'; pickerButtons.value.before?.focus()
}
function release() {
 stopRead('before'); stopRead('after'); loaded.value = { before: null, after: null }; fileErrors.value = { before: '', after: '' }
 for (const control of Object.values(fileInputs.value)) if (control) control.value = ''
 before.value=''; after.value=''; changesOnly.value=false; invalidate()
}
function clear() { release(); pickerButtons.value.before?.focus() }
async function copy(){
 if(copying.value||composing.value||!prepareReport())return
 const snapshot=report.value,revision=version;copying.value=true
 try{if(!window.isSecureContext||!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(snapshot);if(!disposed&&revision===version)message.value='报告已复制。'}
 catch{if(!disposed&&revision===version){message.value='无法自动复制，请选中报告后手动复制。';await nextTick();if(!disposed&&revision===version){reportEditor.value?.focus();reportEditor.value?.select()}}}
 finally{if(!disposed)copying.value=false}
}
onMounted(()=>window.addEventListener('pagehide',release))
onBeforeUnmount(()=>{disposed=true;window.removeEventListener('pagehide',release);release()})
</script>
<template>
 <ToolPageLayout page-name="file-diff"><section class="diff-tool" aria-label="文件对比操作">
  <p id="diff-rules">选择两份文件。仅逐行比较纯文本，不解析表格、JSON结构或Markdown排版；不支持PDF、Word或GBK编码。区分大小写、空格和制表符；CRLF/CR 统一为 LF，保留末尾空行。仅本地处理，不上传或保存。</p>
  <div class="diff-editors">
   <section v-for="side in (['before','after'] as const)" :key="side" class="file-side" :aria-label="side === 'before' ? '原文件区域' : '新文件区域'">
    <label :for="'file-' + side">{{ side === 'before' ? '原文件' : '新文件' }}</label>
    <input :id="'file-' + side" :ref="element => { if(element) fileInputs[side] = element as HTMLInputElement }" type="file" hidden tabindex="-1" accept=".txt,.md,.markdown,.csv,.json" :aria-invalid="!!fileErrors[side]" :aria-describedby="'file-status-' + side + ' diff-rules'" @change="chooseFile($event, side)" />
    <div class="file-read-actions">
     <button :ref="element => {if(element) pickerButtons[side] = element as HTMLButtonElement}" type="button" :aria-describedby="'file-status-' + side + ' file-limits-' + side" @click="fileInputs[side]?.click()">{{ side === 'before' ? '选择原文件' : '选择新文件' }}</button>
     <button v-if="reading[side]" type="button" @click="cancelRead(side)">取消{{ side === 'before' ? '原文件' : '新文件' }}读取</button>
    </div>
    <p :id="'file-limits-' + side" class="file-read-limits">UTF-8 TXT、Markdown、CSV 或 JSON。每份最多 2 MiB，解码后最多 500,000 个 UTF-16 码元、5,000 行。</p>
    <p :id="'file-status-' + side" role="status" aria-live="polite">{{ reading[side] ? fileReadStatus.reading : fileErrors[side] || (loaded[side] ? '文件已读取。' : '请选择文件。') }}</p>
    <p v-if="loaded[side]" class="file-meta">{{ loaded[side]!.name }} · {{ loaded[side]!.size }} 字节 · {{ loaded[side]!.lines }} 行</p>
    <label :for="'preview-' + side">{{ side === 'before' ? '原文件预览（只读）' : '新文件预览（只读）' }}</label>
    <textarea :id="'preview-' + side" :value="loaded[side]?.text ?? ''" readonly rows="9" :spellcheck="false" />
   </section>
  </div>
  <div class="actions"><button class="primary-action" type="button" :disabled="busy || loading || !loaded.before || !loaded.after" @click="run">开始对比</button><button v-if="busy" type="button" @click="cancel">取消对比</button><button type="button" :disabled="loading" @click="swap">交换文件</button><button type="button" @click="clear">清空</button></div>
  <p id="diff-status" role="status" aria-live="polite">{{ error||message }}</p>
  <section v-if="result" class="diff-result" aria-labelledby="diff-heading">
   <h2 id="diff-heading">对比结果</h2><p class="diff-summary">新增 {{ result.added }} 行 · 删除 {{ result.removed }} 行 · 保留 {{ result.unchanged }} 行</p>
   <label class="filter"><input v-model="changesOnly" type="checkbox">仅看变化</label>
   <p v-if="!visibleRows.length">{{ result.rows.length?'当前没有变化行。':'两侧均为空文本。' }}</p>
   <template v-else>
    <nav class="pagination" aria-label="对比结果分页">
     <button type="button" :disabled="page === 1" @click="page--">上一页</button>
     <p role="status" aria-live="polite">第 {{ page }} / {{ pages }} 页，显示第 {{ (page-1)*FILE_DIFF_PAGE+1 }}～{{ Math.min(page*FILE_DIFF_PAGE,visibleRows.length) }} 行，共 {{ visibleRows.length }} 行结果。</p>
     <button type="button" :disabled="page === pages" @click="page++">下一页</button>
    </nav>
    <DiffTable :rows="pageRows" />
   </template>
   <button type="button" :aria-expanded="reportOpen" aria-controls="file-report-panel" @click="toggleReport">{{reportOpen ? '收起完整报告' : '查看完整报告'}}</button>
   <div v-if="reportOpen" id="file-report-panel" class="diff-result">
   <label for="diff-report">对比报告（只读）</label><textarea id="diff-report" ref="reportEditor" :value="report" readonly rows="6" :spellcheck="false" aria-describedby="report-note">
   </textarea></div><p id="report-note">报告包含当前筛选的全部结果，不限于当前页；最多 2,000,000 个码元。含类型与双方行号；不属于 Git 补丁格式。文件名不写入报告。修改按删除与新增表示，不识别移动或字符级差异。</p><button type="button" :disabled="copying||composing" @click="copy">复制对比报告</button>
  </section>
 </section></ToolPageLayout>
</template>
<style scoped>
.diff-tool,.diff-result { display: grid; gap: 16px; min-width: 0; } .diff-tool { margin-block: 24px; }
p { color: var(--color-muted); overflow-wrap: anywhere; } label { display: grid; gap: 8px; font-weight: 650; min-width: 0; }
.file-side { display: grid; gap: 12px; min-width: 0; } input[type=file] { width: 100%; min-width: 0; max-width: 100%; min-height: 44px; }
.diff-editors { display: grid; gap: 16px; grid-template-columns: minmax(0,1fr); }
textarea { box-sizing: border-box; width: 100%; min-width: 0; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; font-family: ui-monospace,monospace; line-height: 1.6; resize: vertical; }
.pagination { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; } .pagination p { flex: 1 1 160px; margin: 0; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; } button { min-height: 44px; max-width: 100%; padding: 8px 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer; justify-self: start; }
.primary-action { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); font-weight: 650; } button:disabled { opacity: .6; cursor: default; }
.filter { display: flex; align-items: center; min-height: 44px; gap: 8px; font-weight: 400; } .filter input { width: 20px; height: 20px; accent-color: var(--color-accent); }
textarea:focus-visible,input:focus-visible,button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; } [role=status] { min-height: 1.7em; }
@media(min-width:768px){.diff-editors { grid-template-columns: repeat(2,minmax(0,1fr)); }}
</style>
