<script setup lang="ts">
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue'
import DiffTable from '@/components/tools/DiffTable.vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import {diffLines,diffErrors,diffReport,type DiffResult,type DiffCode} from '@/utils/textDiff'
const before=ref(''),after=ref(''),result=ref<DiffResult|null>(null),changesOnly=ref(false),busy=ref(false),composing=ref(false),copying=ref(false),message=ref(''),error=ref('')
const beforeEditor=ref<HTMLTextAreaElement>(),reportEditor=ref<HTMLTextAreaElement>()
const visibleRows=computed(()=>result.value?.rows.filter(row=>!changesOnly.value||row.kind!=='same')??[])
const report=computed(()=>result.value?diffReport(result.value,changesOnly.value):'')
let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,version=0,disposed=false
function invalidate(){version++;worker?.terminate();worker=undefined;clearTimeout(timer);busy.value=false;result.value=null;message.value='';error.value=''}
watch([before,after],invalidate,{flush:'sync'})
watch(changesOnly,()=>{if(result.value){version++;message.value='';error.value=''}},{flush:'sync'})
function cancel(){invalidate();message.value='已取消，请调整文本后重试。'}
function run(){
 if(composing.value)return
 invalidate()
 try{diffLines(before.value);diffLines(after.value)}catch(e){error.value=diffErrors[(e as {code:DiffCode}).code]??diffErrors.failed;return}
 const revision=version;busy.value=true;message.value='正在对比…'
 try{
  worker=new Worker(new URL('../../workers/textDiff.worker.ts',import.meta.url),{type:'module'})
  timer=setTimeout(()=>{if(revision===version){invalidate();error.value='对比超过 10 秒，已停止，请减少文本后重试。'}},10000)
  worker.onerror=()=>{if(revision===version){invalidate();error.value=diffErrors.failed}}
  worker.onmessage=event=>{
   if(revision!==version)return
   const data=event.data;invalidate()
   if(!data.ok){error.value=diffErrors[data.code as DiffCode]??diffErrors.failed;return}
   result.value=data.result;message.value=result.value!.added||result.value!.removed?'对比完成。':'两段文本在换行规范化后相同。'
  }
  worker.postMessage({before:before.value,after:after.value})
 }catch{invalidate();error.value='当前浏览器无法启动本地对比，请更新浏览器后重试。'}
}
function swap(){if(composing.value)return;const previous=before.value;before.value=after.value;after.value=previous;invalidate();message.value='已交换，请重新对比。';beforeEditor.value?.focus()}
function release(){before.value='';after.value='';changesOnly.value=false;composing.value=false;invalidate()}
function clear(){if(composing.value)return;release();beforeEditor.value?.focus()}
function example(){if(composing.value)return;if(before.value||after.value){message.value='请先清空现有输入，再填入示例。';return}before.value='准备资料\n校对内容\n发送邮件';after.value='准备资料\n补充配图\n发送邮件';beforeEditor.value?.focus()}
async function copy(){
 if(!report.value||copying.value||composing.value)return
 const snapshot=report.value,revision=version;copying.value=true
 try{if(!window.isSecureContext||!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(snapshot);if(!disposed&&revision===version)message.value='报告已复制。'}
 catch{if(!disposed&&revision===version){message.value='无法自动复制，请选中报告后手动复制。';reportEditor.value?.focus();reportEditor.value?.select()}}
 finally{if(!disposed)copying.value=false}
}
onMounted(()=>window.addEventListener('pagehide',release))
onBeforeUnmount(()=>{disposed=true;window.removeEventListener('pagehide',release);release()})
</script>
<template>
 <ToolPageLayout page-name="text-diff"><section class="diff-tool" aria-label="文本对比操作">
  <p id="diff-rules">逐行对比，区分大小写、空格和制表符；CRLF/CR 统一为 LF，保留末尾空行。每侧最多 100,000 个 UTF-16 码元、1,000 行，不截断。仅本地处理，不上传或保存。</p>
  <div class="diff-editors">
   <label>原文本<textarea ref="beforeEditor" v-model="before" rows="9" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" aria-describedby="diff-rules diff-status" @compositionstart="composing=true;invalidate()" @compositionend="composing=false" /></label>
   <label>新文本<textarea v-model="after" rows="9" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" aria-describedby="diff-rules diff-status" @compositionstart="composing=true;invalidate()" @compositionend="composing=false" /></label>
  </div>
  <div class="actions"><button class="primary-action" type="button" :disabled="busy||composing" @click="run">开始对比</button><button v-if="busy" type="button" @click="cancel">取消对比</button><button type="button" :disabled="composing" @click="swap">交换文本</button><button type="button" :disabled="composing" @click="example">填入示例</button><button type="button" :disabled="composing" @click="clear">清空</button></div>
  <p id="diff-status" role="status" aria-live="polite">{{ error||message }}</p>
  <section v-if="result" class="diff-result" aria-labelledby="diff-heading">
   <h2 id="diff-heading">对比结果</h2><p class="diff-summary">新增 {{ result.added }} 行 · 删除 {{ result.removed }} 行 · 保留 {{ result.unchanged }} 行</p>
   <label class="filter"><input v-model="changesOnly" type="checkbox">仅看变化</label>
   <p v-if="!visibleRows.length">{{ result.rows.length?'当前没有变化行。':'两侧均为空文本。' }}</p>
   <DiffTable v-else :rows="visibleRows" />
   <label for="diff-report">对比报告（只读）</label><textarea id="diff-report" ref="reportEditor" :value="report" readonly rows="6" :spellcheck="false" aria-describedby="report-note">
   </textarea><p id="report-note">报告遵循“仅看变化”筛选，含类型与双方行号；不属于 Git 补丁格式。修改按删除与新增表示，不识别移动或字符级差异。</p><button type="button" :disabled="copying||composing" @click="copy">复制对比报告</button>
  </section>
 </section></ToolPageLayout>
</template>
<style scoped>
.diff-tool,.diff-result { display: grid; gap: 16px; min-width: 0; } .diff-tool { margin-block: 24px; }
p { color: var(--color-muted); overflow-wrap: anywhere; } label { display: grid; gap: 8px; font-weight: 650; min-width: 0; }
.diff-editors { display: grid; gap: 16px; grid-template-columns: minmax(0,1fr); }
textarea { box-sizing: border-box; width: 100%; min-width: 0; padding: 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; font-family: ui-monospace,monospace; line-height: 1.6; resize: vertical; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; } button { min-height: 44px; max-width: 100%; padding: 8px 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer; justify-self: start; }
.primary-action { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); font-weight: 650; } button:disabled { opacity: .6; cursor: default; }
.filter { display: flex; align-items: center; min-height: 44px; gap: 8px; font-weight: 400; } .filter input { width: 20px; height: 20px; accent-color: var(--color-accent); }
textarea:focus-visible,input:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; } [role=status] { min-height: 1.7em; }
@media(min-width:768px){.diff-editors { grid-template-columns: repeat(2,minmax(0,1fr)); }}
</style>
