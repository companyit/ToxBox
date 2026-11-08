<script setup lang="ts">
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import DiffTable from '@/components/tools/DiffTable.vue'
import {workflowPreset,workbenchOperations,workflowErrors,workflowReport,type TextStep,type WorkflowResult,type WorkflowCode} from '@/utils/textWorkbench'
import type {CleanupOperation} from '@/utils/textCleanup'
const input=ref(''),steps=ref<TextStep[]>(workflowPreset('list')),newOperation=ref<CleanupOperation>('replace'),result=ref<WorkflowResult|null>(null),busy=ref(false),composing=ref(false),copying=ref(false),message=ref(''),error=ref('')
const editor=ref<HTMLTextAreaElement>(),outputEditor=ref<HTMLTextAreaElement>(),reportEditor=ref<HTMLTextAreaElement>()
const report=computed(()=>result.value?workflowReport(result.value):''),changes=computed(()=>result.value?.diff.rows.filter(row=>row.kind!=='same')??[])
let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,version=0,disposed=false
function invalidate(){version++;worker?.terminate();worker=undefined;clearTimeout(timer);busy.value=false;result.value=null;message.value='';error.value=''}
watch([input,steps],invalidate,{deep:true,flush:'sync'})
function preset(name:'list'|'copy'){if(composing.value)return;steps.value=workflowPreset(name);message.value='流程已更新，原文保留，请重新运行。'}
function add(){if(composing.value||steps.value.length>=8)return;steps.value.push({operation:newOperation.value,find:'',replacement:''})}
function move(index:number,delta:number){if(composing.value)return;const target=index+delta;if(target<0||target>=steps.value.length)return;const next=[...steps.value];[next[index],next[target]]=[next[target]!,next[index]!];steps.value=next}
function remove(index:number){if(!composing.value)steps.value.splice(index,1)}
function cancel(){invalidate();message.value='已取消，原文和流程保留。'}
function run(){
 if(composing.value)return
 invalidate()
 if(input.value.length>100000){error.value=workflowErrors.size;return}
 const invalid=steps.value.findIndex(step=>step.operation==='replace'&&(!step.find||step.find.length>1000||step.replacement.length>1000))
 if(invalid>=0){error.value=`第 ${invalid+1} 步：${workflowErrors.parameters}`;return}
 const revision=version;busy.value=true;message.value='正在执行流程…'
 try{
  worker=new Worker(new URL('../../workers/textWorkbench.worker.ts',import.meta.url),{type:'module'})
  timer=setTimeout(()=>{if(revision===version){invalidate();error.value='处理超过 10 秒，已停止，请减少文本或步骤。'}},10000)
  worker.onerror=()=>{if(revision===version){invalidate();error.value=workflowErrors.failed}}
  worker.onmessage=event=>{
   if(revision!==version)return
   const data=event.data;invalidate()
   if(!data.ok){error.value=(Number.isInteger(data.step)&&data.step>=1&&data.step<=8?`第 ${data.step} 步：`:'')+(workflowErrors[data.code as WorkflowCode]??workflowErrors.failed);return}
   result.value=data.result;message.value=result.value!.output?'流程完成，请核对结果。':'流程完成，最终文本为空。'
  }
  worker.postMessage({input:input.value,steps:steps.value.map(step=>step.operation==='replace'?{...step}:{operation:step.operation,find:'',replacement:''})})
 }catch{invalidate();error.value='当前浏览器无法启动本地流程，请更新浏览器后重试。'}
}
function release(){input.value='';steps.value=workflowPreset('list');newOperation.value='replace';composing.value=false;invalidate()}
function clear(){if(composing.value)return;release();editor.value?.focus()}
function example(){if(composing.value)return;if(input.value){message.value='请先清空现有输入，再填入示例。';return}input.value='  乙  \n甲\n  乙\n \n旧称';editor.value?.focus()}
async function copy(kind:'output'|'report'){
 const snapshot=kind==='output'?(result.value?.output??''):report.value
 if(!snapshot||copying.value||composing.value)return
 const revision=version;copying.value=true
 try{if(!window.isSecureContext||!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText(snapshot);if(!disposed&&revision===version)message.value=kind==='output'?'最终文本已复制。':'流程报告已复制。'}
 catch{if(!disposed&&revision===version){message.value='无法自动复制，请选中对应文本后手动复制。';const target=kind==='output'?outputEditor.value:reportEditor.value;target?.focus();target?.select()}}
 finally{if(!disposed)copying.value=false}
}
onMounted(()=>window.addEventListener('pagehide',release))
onBeforeUnmount(()=>{disposed=true;window.removeEventListener('pagehide',release);release()})
</script>
<template>
 <ToolPageLayout page-name="text-workbench"><section class="workbench" aria-label="文本处理流程">
  <p id="workflow-rules">把清理、去重、排序或替换串起来，一次执行后查看统计与差异。每步接收上一步结果；原文保留，不自动回灌。仅在本地处理，不上传或保存。</p>
  <div class="actions presets" aria-label="流程预设"><button type="button" :disabled="composing" @click="preset('list')">名单去重排序</button><button type="button" :disabled="composing" @click="preset('copy')">文案整理替换</button></div>
  <label for="workflow-input">待处理文本</label><textarea id="workflow-input" ref="editor" v-model="input" rows="8" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="!!error" aria-describedby="workflow-rules workflow-limits workflow-status" @compositionstart="composing=true;invalidate()" @compositionend="composing=false" />
  <section aria-labelledby="workflow-heading"><h2 id="workflow-heading">处理步骤 <small>{{ steps.length }}/8</small></h2>
   <ol class="workflow-steps"><li v-for="(step,index) in steps" :key="index">
    <label :for="`step-operation-${index}`">第 {{ index+1 }} 步操作</label><select :id="`step-operation-${index}`" v-model="step.operation" :disabled="composing"><option v-for="operation in workbenchOperations" :key="operation.value" :value="operation.value">{{ operation.label }}</option></select>
    <div v-if="step.operation==='replace'" class="replace-fields"><label>第 {{ index+1 }} 步查找<input v-model="step.find" type="text" autocomplete="off" :spellcheck="false" @compositionstart="composing=true;invalidate()" @compositionend="composing=false"></label><label>第 {{ index+1 }} 步替换为<input v-model="step.replacement" type="text" autocomplete="off" :spellcheck="false" @compositionstart="composing=true;invalidate()" @compositionend="composing=false"></label></div>
    <div class="actions"><button type="button" :disabled="composing||index===0" :aria-label="`上移第 ${index+1} 步`" @click="move(index,-1)">上移</button><button type="button" :disabled="composing||index===steps.length-1" :aria-label="`下移第 ${index+1} 步`" @click="move(index,1)">下移</button><button type="button" :disabled="composing" :aria-label="`移除第 ${index+1} 步`" @click="remove(index)">移除</button></div>
   </li></ol>
   <p v-if="!steps.length">请添加至少一个处理步骤。</p>
   <div class="add-step"><label for="new-operation">新增操作</label><select id="new-operation" v-model="newOperation" :disabled="composing"><option v-for="operation in workbenchOperations" :key="operation.value" :value="operation.value">{{ operation.label }}</option></select><button type="button" :disabled="composing||steps.length>=8" @click="add">添加步骤</button></div>
  </section>
  <p id="workflow-limits">输入和每步结果最多 100,000 UTF-16 码元、1,000 行；CRLF/CR 统一 LF，结尾空行保留。普通替换区分大小写、不支持正则，查找非空、查找/替换各最多 1,000 码元。去重保留首次；排序按 UTF-16 顺序，不是拼音或自然数字。改动输入或步骤会撤销结果；10 秒超时可取消。</p>
  <div class="actions"><button class="primary-action" type="button" :disabled="busy||composing||!steps.length" @click="run">运行流程</button><button v-if="busy" type="button" @click="cancel">取消处理</button><button type="button" :disabled="composing" @click="example">填入示例</button><button type="button" :disabled="composing" @click="clear">清空全部</button></div>
  <p id="workflow-status" role="status" aria-live="polite">{{ error||message }}</p>
  <section v-if="result" class="workflow-result" aria-labelledby="workflow-result-heading">
   <h2 id="workflow-result-heading">处理结果</h2><p class="workflow-summary">原文 {{ result.original.characters }} 字符 / {{ result.original.lines }} 行 → 最终 {{ result.final.characters }} 字符 / {{ result.final.lines }} 行</p><p>字符按 Unicode 码点统计，行数按 LF 分行；数量均基于规范化文本。</p>
   <ol class="stage-summary"><li v-for="(stage,index) in result.stages" :key="index">{{ stage.label }}：{{ stage.characters }} 字符 / {{ stage.lines }} 行 · {{ stage.changed?'有变化':'无变化' }}</li></ol>
   <label for="workflow-output">最终文本（只读）</label><textarea id="workflow-output" ref="outputEditor" :value="result.output" readonly rows="8" :spellcheck="false" /><button type="button" :disabled="copying||composing||!result.output" @click="copy('output')">复制最终文本</button>
   <details><summary>查看逐行变化：新增 {{ result.diff.added }} 行 · 删除 {{ result.diff.removed }} 行</summary><DiffTable v-if="changes.length" :rows="changes" /><p v-else>原文与最终文本没有逐行变化。</p><p>只显示变化行，修改按删除加新增表示。</p></details>
   <details><summary>查看流程报告</summary><label for="workflow-report">流程报告（只读）</label><textarea id="workflow-report" ref="reportEditor" :value="report" readonly rows="6" :spellcheck="false" /><p>报告仅含步骤名称、数量和增删摘要，不含原文或替换参数。</p><button type="button" :disabled="copying||composing" @click="copy('report')">复制流程报告</button></details>
  </section>
 </section></ToolPageLayout>
</template>
<style scoped>
.workbench,.workflow-result { display: grid; gap: 16px; min-width: 0; } .workbench { margin-block: 24px; } p { color: var(--color-muted); overflow-wrap: anywhere; } label { display: grid; gap: 8px; font-weight: 650; min-width: 0; }
h2 { font-size: 1.25rem; } h2 small { font-size: .875rem; color: var(--color-muted); }
textarea,input[type=text],select { box-sizing: border-box; width: 100%; min-width: 0; max-width: 100%; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; font-weight: 400; }
textarea { padding: 16px; resize: vertical; font-family: ui-monospace,monospace; line-height: 1.6; } input[type=text],select { min-height: 44px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
button { min-height: 44px; max-width: 100%; padding: 8px 14px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer; justify-self: start; }
.primary-action { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); font-weight: 650; } button:disabled { opacity: .6; cursor: default; }
.workflow-steps { list-style: none; padding: 0; display: grid; gap: 12px; margin-block: 16px; } .workflow-steps li { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; min-width: 0; }
.replace-fields { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,180px),1fr)); gap: 12px; }
.add-step { display: grid; gap: 8px; } .stage-summary { padding-left: 24px; overflow-wrap: anywhere; }
details { min-width: 0; border-top: 1px solid var(--color-border); padding-top: 12px; } summary { min-height: 44px; cursor: pointer; padding-block: 8px; color: var(--color-accent); } details[open] { display: grid; gap: 12px; }
input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; } [role=status] { min-height: 1.7em; }
@media(min-width:640px){.add-step { grid-template-columns: auto minmax(0,1fr) auto; align-items: center; }}
</style>
