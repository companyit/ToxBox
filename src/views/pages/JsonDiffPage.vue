<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { jsonDiffErrors, jsonDiffReport, jsonChangeLabels, validateJsonDiffInput, JsonDiffFailure, JSON_DIFF_PAGE, type JsonDiffCode, type JsonDiffFilter, type JsonDiffResult } from '@/utils/jsonDiff'
const before=ref(''),after=ref(''),result=shallowRef<JsonDiffResult|null>(null)
const busy=ref(false),composing=ref(false),copying=ref(false),message=ref(''),error=ref(''),errorSide=ref('')
const filter=ref<JsonDiffFilter>('all'),page=ref(1),report=ref(''),reportOpen=ref(false)
const beforeEditor=ref<HTMLTextAreaElement>(),reportEditor=ref<HTMLTextAreaElement>()
const filtered=computed(()=>result.value?.changes.filter(item=>filter.value==='all'||item.kind===filter.value)??[])
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/JSON_DIFF_PAGE)))
const visible=computed(()=>filtered.value.slice((page.value-1)*JSON_DIFF_PAGE,page.value*JSON_DIFF_PAGE))
let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,version=0,disposed=false
function resetReport(){report.value='';reportOpen.value=false}
function invalidate(){version++;worker?.terminate();worker=undefined;clearTimeout(timer);busy.value=false;result.value=null;page.value=1;resetReport();message.value='';error.value='';errorSide.value=''}
watch([before,after],invalidate,{flush:'sync'})
watch(filter,()=>{version++;page.value=1;resetReport();message.value='';error.value='';errorSide.value=''}, {flush:'sync'})
function fail(data:{code?:JsonDiffCode;side?:string;line?:number;column?:number}){
 errorSide.value=data.side==='before'||data.side==='after'?data.side:''
 error.value=(errorSide.value?(errorSide.value==='before'?'原 JSON：':'新 JSON：'):'')+(data.line?`第 ${data.line} 行，第 ${data.column} 列：`:'')+(jsonDiffErrors[data.code??'failed']??jsonDiffErrors.failed)
}
function run(){
 if(busy.value||composing.value)return
 invalidate()
 try{validateJsonDiffInput(before.value,'before');validateJsonDiffInput(after.value,'after')}
 catch(failure){fail(failure instanceof JsonDiffFailure?failure:{code:'failed'});return}
 const revision=version;busy.value=true;message.value='正在本地比较 JSON 结构…'
 try{
  worker=new Worker(new URL('../../workers/jsonDiff.worker.ts',import.meta.url),{type:'module'})
  timer=setTimeout(()=>{if(revision===version){invalidate();error.value='结构对比超过 10 秒，已停止，请减少内容后重试。'}},10000)
  worker.onerror=()=>{if(revision===version){invalidate();fail({code:'failed'})}}
  worker.onmessage=event=>{
   if(revision!==version)return
   const data=event.data;invalidate()
   if(!data.ok){fail(data);return}
   result.value=data.result;message.value=result.value!.changes.length?'结构对比完成。':'两侧 JSON 在当前比较规则下相同。'
  }
  worker.postMessage({before:before.value,after:after.value})
 }catch{invalidate();fail({code:'failed'})}
}
function cancel(){invalidate();message.value='已取消，输入保持不变。'}
function swap(){if(composing.value)return;const original=before.value;before.value=after.value;after.value=original;invalidate();message.value='已交换，请重新对比。';beforeEditor.value?.focus()}
function example(){
 if(composing.value)return
 if(before.value||after.value){error.value='';errorSide.value='';message.value='请先清空两侧输入，再填入示例。';return}
 before.value='{\n  "data": {"name": "甲", "score": 95, "active": true, "tags": ["A", "B"]},\n  "old": null,\n  "id": 9007199254740993\n}'
 after.value='{\n  "id": 9007199254740994,\n  "data": {"score": 96, "name": "甲", "active": false, "tags": ["A", "C"]},\n  "new": "新增字段"\n}'
 beforeEditor.value?.focus()
}
function release(){composing.value=false;before.value='';after.value='';filter.value='all';invalidate()}
function clear(){if(composing.value)return;release();beforeEditor.value?.focus()}
function prepareReport(){if(!result.value)return false;try{report.value=jsonDiffReport(result.value,filter.value);reportOpen.value=true;error.value='';return true}catch{resetReport();fail({code:'report'});return false}}
function toggleReport(){if(reportOpen.value){reportOpen.value=false;return};prepareReport()}
async function copy(){
 if(copying.value||composing.value||!prepareReport())return
 const snapshot=report.value,revision=version;copying.value=true
 try{if(!window.isSecureContext||!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(snapshot);if(!disposed&&revision===version)message.value='报告已复制。'}
 catch{if(!disposed&&revision===version){message.value='无法自动复制，请选中完整报告后手动复制。';await nextTick();if(!disposed&&revision===version){reportEditor.value?.focus();reportEditor.value?.select()}}}
 finally{if(!disposed)copying.value=false}
}
function compositionStart(){composing.value=true;invalidate()}
onMounted(()=>window.addEventListener('pagehide',release))
onBeforeUnmount(()=>{disposed=true;window.removeEventListener('pagehide',release);release()})
</script>
<template>
 <ToolPageLayout page-name="json-diff"><section class="json-diff-tool" aria-label="JSON结构对比操作">
  <p id="json-diff-rules">忽略排版和对象字段顺序，数组按索引比较，不识别移动或主键。缺失字段与 null、字符串与数字均不同；数值按任意精度十进制比较，1、1.0、1e0 相同，-0 与 0 相同。展示值保留原数值写法。只接受严格 JSON，不接受 BOM、注释、末尾逗号或重复字段。</p>
  <p id="json-diff-limits">每侧最多 100,000 个 UTF-16 码元、30 层容器、50,000 个节点（含键）；最多 2,000 项差异，路径和值内容最多 1,000,000 码元，超限不截断。10 秒保护，可取消。仅本地处理，不上传或保存；本页无统计或广告脚本。</p>
  <div class="editors">
   <label>原 JSON<textarea ref="beforeEditor" v-model="before" rows="10" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="errorSide==='before'" aria-describedby="json-diff-rules json-diff-limits json-diff-status" @compositionstart="compositionStart" @compositionend="composing=false" /></label>
   <label>新 JSON<textarea v-model="after" rows="10" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="errorSide==='after'" aria-describedby="json-diff-rules json-diff-limits json-diff-status" @compositionstart="compositionStart" @compositionend="composing=false" /></label>
  </div>
  <div class="actions"><button type="button" class="primary-action" :disabled="busy||composing" @click="run">对比 JSON 结构</button><button v-if="busy" type="button" @click="cancel">取消对比</button><button type="button" :disabled="composing" @click="swap">交换 JSON</button><button type="button" :disabled="composing" @click="example">填入示例</button><button type="button" :disabled="composing" @click="clear">清空</button></div>
  <p id="json-diff-status" role="status" aria-live="polite">{{error||message}}</p>
  <section v-if="result" class="results" aria-labelledby="json-diff-heading">
   <h2 id="json-diff-heading">结构差异</h2><p class="summary">新增 {{result.added}} 项 · 删除 {{result.removed}} 项 · 修改 {{result.modified}} 项</p>
   <label for="json-diff-filter">差异类型</label><select id="json-diff-filter" v-model="filter"><option value="all">全部差异</option><option value="add">仅新增</option><option value="remove">仅删除</option><option value="change">仅修改</option></select>
   <p v-if="!filtered.length">{{result.changes.length?'当前筛选没有差异。':'没有结构差异。'}}</p>
   <template v-else>
    <nav class="pagination" aria-label="结构差异分页"><button type="button" :disabled="page===1" @click="page--">上一页</button><p role="status" aria-live="polite">第 {{page}} / {{pages}} 页，显示第 {{(page-1)*JSON_DIFF_PAGE+1}}～{{Math.min(page*JSON_DIFF_PAGE,filtered.length)}} 项，共 {{filtered.length}} 项。</p><button type="button" :disabled="page===pages" @click="page++">下一页</button></nav>
    <ol class="change-list" :start="(page-1)*JSON_DIFF_PAGE+1"><li v-for="item in visible" :key="item.path" :class="'change-'+item.kind"><p><strong>{{jsonChangeLabels[item.kind]}}</strong> · <code class="change-path">{{item.path||'（根节点，空指针）'}}</code></p><dl><div><dt>原值</dt><dd><pre>{{item.before??'（不存在）'}}</pre></dd></div><div><dt>新值</dt><dd><pre>{{item.after??'（不存在）'}}</pre></dd></div></dl></li></ol>
   </template>
   <p>路径使用 JSON Pointer：~0 表示 ~，~1 表示 /。新增/删除的对象或数组整体展示，不重复列出子项；结果不是 JSON Patch。</p>
   <button type="button" :aria-expanded="reportOpen" aria-controls="json-diff-report-panel" @click="toggleReport">{{reportOpen?'收起完整报告':'查看完整报告'}}</button>
   <div v-if="reportOpen" id="json-diff-report-panel"><label for="json-diff-report">结构对比报告（只读）</label><textarea id="json-diff-report" ref="reportEditor" :value="report" readonly rows="7" :spellcheck="false" /></div>
   <p>报告包含当前筛选的全部结果，不限于当前页，最多 1,000,000 个码元。</p><button type="button" :disabled="copying||composing" @click="copy">复制结构对比报告</button>
  </section>
 </section></ToolPageLayout>
</template>
<style scoped>
.json-diff-tool,.results {display:grid;gap:16px;min-width:0}.json-diff-tool{margin-block:24px}p{color:var(--color-muted);line-height:1.7;overflow-wrap:anywhere}label{display:grid;gap:8px;min-width:0;font-weight:650}.editors{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
textarea{box-sizing:border-box;width:100%;min-width:0;max-width:100%;padding:16px;border:1px solid var(--color-control-border);border-radius:var(--ui-control-radius);background:var(--color-surface);color:var(--color-text);font:inherit;font-family:ui-monospace,monospace;line-height:1.6;resize:vertical}
button,select{box-sizing:border-box;min-height:44px;max-width:100%;min-width:0;padding:8px 16px;border:1px solid var(--color-control-border);border-radius:var(--ui-control-radius);background:var(--color-surface);color:var(--color-text);font:inherit}button{cursor:pointer;justify-self:start}button:disabled{opacity:.6;cursor:default}.primary-action{background:var(--color-accent);color:var(--color-on-accent);font-weight:650}.actions,.pagination{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.pagination p{flex:1 1 160px;margin:0}
.change-list{display:grid;gap:16px;padding-left:24px;min-width:0}.change-list li{padding:12px;border:1px solid var(--color-border);border-radius:var(--ui-control-radius);min-width:0}.change-list li>p{margin-top:0}.change-add{border-left:4px solid var(--color-accent)!important}.change-remove{border-left:4px solid #b3524b!important}.change-change{border-left:4px solid var(--color-muted)!important}.change-path{white-space:pre-wrap;overflow-wrap:anywhere}dl{display:grid;gap:12px;min-width:0;margin:0}dl>div{min-width:0}dt{font-weight:650}dd{margin:4px 0 0;min-width:0}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-family:ui-monospace,monospace}textarea:focus-visible,button:focus-visible,select:focus-visible{outline:3px solid var(--color-focus);outline-offset:3px}[role=status]{min-height:1.7em}
@media(min-width:768px){.editors,dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
