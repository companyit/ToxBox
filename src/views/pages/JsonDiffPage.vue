<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { validateJsonFile, jsonFileErrors, JsonFileError, type JsonFileCode } from '@/utils/jsonFile'
import { matchJsonPaths } from '@/utils/jsonDiffNavigation'
import { fileReadStatus } from '@/utils/fileReadStatus'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { jsonDiffErrors, jsonDiffReport, jsonChangeLabels, validateJsonDiffInput, JsonDiffFailure, JSON_DIFF_PAGE, type JsonDiffCode, type JsonDiffFilter, type JsonDiffResult } from '@/utils/jsonDiff'
const before=ref(''),after=ref(''),result=shallowRef<JsonDiffResult|null>(null)
const busy=ref(false),composing=ref(false),copying=ref(false),message=ref(''),error=ref(''),errorSide=ref('')
const filter=ref<JsonDiffFilter>('all'),page=ref(1),report=ref(''),reportOpen=ref(false)
const searchText=ref(''),query=ref(''),searchComposing=ref(false),currentMatch=ref(-1)
const changeList=ref<HTMLOListElement>()
let navigationVersion=0
const beforeEditor=ref<HTMLTextAreaElement>(),reportEditor=ref<HTMLTextAreaElement>()
type Side = 'before' | 'after'
const reading=ref<Record<Side,boolean>>({before:false,after:false})
const sources=ref<Record<Side,{name:string;size:number}|null>>({before:null,after:null})
const fileMessages=ref<Record<Side,string>>({before:'',after:''})
const pickerButtons=ref<Partial<Record<Side,HTMLButtonElement>>>({})
const cancelButtons=ref<Partial<Record<Side,HTMLButtonElement|null>>>({})
const fileInputs=ref<Partial<Record<Side,HTMLInputElement>>>({})
const readers:Partial<Record<Side,Worker>>={},readTimers:Partial<Record<Side,ReturnType<typeof setTimeout>>>={}
const generations={before:0,after:0}
const loading=computed(()=>reading.value.before||reading.value.after)
function stopRead(side:Side){generations[side]++;readers[side]?.terminate();delete readers[side];clearTimeout(readTimers[side]);delete readTimers[side];reading.value[side]=false}
function finishRead(side: Side) {
  stopRead(side)
  const button = cancelButtons.value[side]
  if (button && button.ownerDocument.activeElement === button) pickerButtons.value[side]?.focus()
}
function cancelRead(side:Side){stopRead(side);fileMessages.value[side]=fileReadStatus.canceled;pickerButtons.value[side]?.focus()}
function edited(side:Side){stopRead(side);sources.value[side]=null;fileMessages.value[side]=''}
function chooseFile(event:Event,side:Side){
 const control=event.target as HTMLInputElement,file=control.files?.[0];control.value=''
 if(!file||composing.value)return
 stopRead(side);invalidate();fileMessages.value[side]=''
 try{validateJsonFile(file.name,file.size)}catch(failure){fileMessages.value[side]=(failure instanceof JsonFileError && failure.code !== 'failed' ? jsonFileErrors[failure.code] + fileReadStatus.retained : fileReadStatus.failed);return}
 const generation=generations[side]
 const fail=(message:string)=>{if(generation!==generations[side])return;finishRead(side);fileMessages.value[side]=message}
 try{
  const reader=new Worker(new URL('../../workers/jsonFile.worker.ts',import.meta.url),{type:'module'})
  readers[side]=reader;reading.value[side]=true
  readTimers[side]=setTimeout(()=>fail(fileReadStatus.timeout),10000)
  reader.onerror=()=>fail(fileReadStatus.failed)
  reader.onmessage=event=>{
   if(generation!==generations[side])return
   const data=event.data
   if(!data.ok){fail(data.code === 'failed' || !jsonFileErrors[data.code as JsonFileCode] ? fileReadStatus.failed : jsonFileErrors[data.code as JsonFileCode] + fileReadStatus.retained);return}
   finishRead(side)
   if(side==='before')before.value=data.text;else after.value=data.text
   sources.value[side]={name:file.name,size:file.size};fileMessages.value[side]='文件已导入，可继续编辑；请手动对比。'
  }
  reader.postMessage({file})
 }catch{fail(fileReadStatus.failed)}
}
const filtered=computed(()=>result.value?.changes.filter(item=>filter.value==='all'||item.kind===filter.value)??[])
const matches=computed(()=>matchJsonPaths(filtered.value,query.value))
const activeIndex=computed(()=>currentMatch.value<0?-1:(matches.value[currentMatch.value]??-1))
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/JSON_DIFF_PAGE)))
const visible=computed(()=>filtered.value.slice((page.value-1)*JSON_DIFF_PAGE,page.value*JSON_DIFF_PAGE))
let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,version=0,disposed=false
function resetReport(){report.value='';reportOpen.value=false}
function invalidate(){resetNavigation();searchComposing.value=false;searchText.value='';query.value='';version++;worker?.terminate();worker=undefined;clearTimeout(timer);busy.value=false;result.value=null;page.value=1;resetReport();message.value='';error.value='';errorSide.value=''}
watch([before,after],invalidate,{flush:'sync'})
watch(searchText,()=>{if(!searchComposing.value)query.value=searchText.value},{flush:'sync'})
watch(query,resetNavigation,{flush:'sync'})
watch(filter,()=>{resetNavigation();version++;page.value=1;resetReport();message.value='';error.value='';errorSide.value=''}, {flush:'sync'})
function resetNavigation(){navigationVersion++;currentMatch.value=-1}
function changePage(next:number){resetNavigation();page.value=next}
function finishSearch(event:CompositionEvent){searchComposing.value=false;searchText.value=(event.target as HTMLInputElement).value;query.value=searchText.value}
function searchEnter(event:KeyboardEvent){if(event.isComposing||searchComposing.value||event.keyCode===229)return;event.preventDefault();void locate(0)}
async function locate(position:number){
 if(searchComposing.value||position<0||position>=matches.value.length)return
 const revision=++navigationVersion,index=matches.value[position]!
 currentMatch.value=position;page.value=Math.floor(index/JSON_DIFF_PAGE)+1
 await nextTick()
 if(disposed||revision!==navigationVersion||activeIndex.value!==index)return
 const target=changeList.value?.querySelector<HTMLElement>('[data-change-index="'+index+'"]')
 target?.focus({preventScroll:true});target?.scrollIntoView({block:'center',behavior:'auto'})
}
function fail(data:{code?:JsonDiffCode;side?:string;line?:number;column?:number}){
 errorSide.value=data.side==='before'||data.side==='after'?data.side:''
 error.value=(errorSide.value?(errorSide.value==='before'?'原 JSON：':'新 JSON：'):'')+(data.line?`第 ${data.line} 行，第 ${data.column} 列：`:'')+(jsonDiffErrors[data.code??'failed']??jsonDiffErrors.failed)
}
function run(){
 if(busy.value||loading.value||composing.value)return
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
function swap(){if(composing.value||loading.value)return;const original=before.value;before.value=after.value;after.value=original;sources.value={before:sources.value.after,after:sources.value.before};fileMessages.value={before:fileMessages.value.after,after:fileMessages.value.before};invalidate();message.value='已交换，请重新对比。';beforeEditor.value?.focus()}
function example(){
 if(composing.value||loading.value)return
 if(before.value||after.value){error.value='';errorSide.value='';message.value='请先清空两侧输入，再填入示例。';return}
 before.value='{\n  "data": {"name": "甲", "score": 95, "active": true, "tags": ["A", "B"]},\n  "old": null,\n  "id": 9007199254740993\n}'
 after.value='{\n  "id": 9007199254740994,\n  "data": {"score": 96, "name": "甲", "active": false, "tags": ["A", "C"]},\n  "new": "新增字段"\n}'
 beforeEditor.value?.focus()
}
function release(){stopRead('before');stopRead('after');sources.value={before:null,after:null};fileMessages.value={before:'',after:''};for(const control of Object.values(fileInputs.value))if(control)control.value='';composing.value=false;before.value='';after.value='';filter.value='all';invalidate()}
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
function compositionStart(side:Side){composing.value=true;edited(side);invalidate()}
onMounted(()=>window.addEventListener('pagehide',release))
onBeforeUnmount(()=>{disposed=true;window.removeEventListener('pagehide',release);release()})
</script>
<template>
 <ToolPageLayout page-name="json-diff"><section class="json-diff-tool" aria-label="JSON结构对比操作">
  <p id="json-diff-rules">忽略排版和对象字段顺序，数组按索引比较，不识别移动或主键。缺失字段与 null、字符串与数字均不同；数值按任意精度十进制比较，1、1.0、1e0 相同，-0 与 0 相同。展示值保留原数值写法。只接受严格 JSON，不接受 BOM、注释、末尾逗号或重复字段。</p>
  <p id="json-diff-limits">每侧最多 100,000 个 UTF-16 码元、30 层容器、50,000 个节点（含键）；最多 2,000 项差异，路径和值内容最多 1,000,000 码元，超限不截断。10 秒保护，可取消。仅本地处理，不上传或保存；本页无统计或广告脚本。</p>
  <p id="json-file-help">读取成功才替换对应输入，之后可编辑并手动对比。按原文保留换行、数字和 BOM，BOM 或非法 JSON 在对比时提示错误。</p>
  <div class="editors">
   <div v-for="side in (['before','after'] as const)" :key="side" class="json-side">
    <div class="file-import">
     <input :id="'json-file-'+side" :ref="element=>{if(element)fileInputs[side]=element as HTMLInputElement}" type="file" hidden tabindex="-1" accept=".json" :aria-label="side==='before'?'原 JSON 文件':'新 JSON 文件'" @change="chooseFile($event,side)" />
     <div class="file-read-actions">
      <button :ref="element=>{if(element)pickerButtons[side]=element as HTMLButtonElement}" type="button" :disabled="composing" :aria-describedby="'json-file-help json-file-limits-'+side+' json-file-status-'+side" @click="fileInputs[side]?.click()">{{side==='before'?'导入原 JSON 文件':'导入新 JSON 文件'}}</button>
      <button v-if="reading[side]" :ref="element => { cancelButtons[side] = element as HTMLButtonElement | null }" type="button" @click="cancelRead(side)">{{side==='before'?'取消原文件读取':'取消新文件读取'}}</button>
     </div>
     <p :id="'json-file-limits-'+side" class="file-read-limits">UTF-8 .json，每份最多 400,000 字节，解码后最多 100,000 个 UTF-16 码元。</p>
     <p :id="'json-file-status-'+side" role="status" aria-live="polite">{{reading[side]?fileReadStatus.reading:fileMessages[side]}}</p>
     <p v-if="sources[side]" class="file-source">当前来源：{{sources[side]!.name}} · {{sources[side]!.size}} 字节</p>
    </div>
    <label v-if="side==='before'">原 JSON<textarea :ref="element=>{beforeEditor=element as HTMLTextAreaElement}" v-model="before" rows="10" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="errorSide==='before'" aria-describedby="json-diff-rules json-diff-limits json-diff-status" @input="edited(side)" @compositionstart="compositionStart(side)" @compositionend="composing=false" /></label>
    <label v-else>新 JSON<textarea v-model="after" rows="10" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="errorSide==='after'" aria-describedby="json-diff-rules json-diff-limits json-diff-status" @input="edited(side)" @compositionstart="compositionStart(side)" @compositionend="composing=false" /></label>
   </div>
  </div>
  <div class="actions"><button type="button" class="primary-action" :disabled="busy||loading||composing" @click="run">对比 JSON 结构</button><button v-if="busy" type="button" @click="cancel">取消对比</button><button type="button" :disabled="composing||loading" @click="swap">交换 JSON</button><button type="button" :disabled="composing||loading" @click="example">填入示例</button><button type="button" :disabled="composing" @click="clear">清空</button></div>
  <p id="json-diff-status" role="status" aria-live="polite">{{error||message}}</p>
  <section v-if="result" class="results" aria-labelledby="json-diff-heading">
   <h2 id="json-diff-heading">结构差异</h2><p class="summary">新增 {{result.added}} 项 · 删除 {{result.removed}} 项 · 修改 {{result.modified}} 项</p>
   <label for="json-diff-filter">差异类型</label><select id="json-diff-filter" v-model="filter" :disabled="searchComposing"><option value="all">全部差异</option><option value="add">仅新增</option><option value="remove">仅删除</option><option value="change">仅修改</option></select>
   <label for="json-path-search">字段路径查找</label>
   <input id="json-path-search" v-model="searchText" type="search" maxlength="1000" autocomplete="off" autocapitalize="off" :spellcheck="false" aria-describedby="json-path-help json-navigation-status" @compositionstart="searchComposing=true;resetNavigation()" @compositionend="finishSearch" @keydown.enter="searchEnter" />
   <p id="json-path-help">按 JSON Pointer 原文查找，区分大小写，不使用正则；~0 表示 ~，~1 表示 /，最多 1,000 个码元。留空定位当前类型的全部差异。查找只用于定位，分页、统计及完整报告范围不变。</p>
   <nav class="change-navigation" aria-label="差异定位">
    <div class="actions"><button type="button" :disabled="searchComposing||!matches.length" @click="locate(0)">定位首处</button><button type="button" :disabled="searchComposing||currentMatch<=0" @click="locate(currentMatch-1)">上一处差异</button><button type="button" :disabled="searchComposing||!matches.length||currentMatch===matches.length-1" @click="locate(currentMatch+1)">下一处差异</button></div>
    <p id="json-navigation-status" role="status" aria-live="polite">{{searchComposing?'正在输入查找路径…':!matches.length?'没有匹配的差异路径。':currentMatch<0?`找到 ${matches.length} 处，尚未定位。`:`当前第 ${currentMatch+1} / ${matches.length} 处；当前类型共 ${filtered.length} 项差异。`}}</p>
   </nav>
   <p v-if="!filtered.length">{{result.changes.length?'当前筛选没有差异。':'没有结构差异。'}}</p>
   <template v-else>
    <nav class="pagination" aria-label="结构差异分页"><button type="button" :disabled="page===1" @click="changePage(page-1)">上一页</button><p role="status" aria-live="polite">第 {{page}} / {{pages}} 页，显示第 {{(page-1)*JSON_DIFF_PAGE+1}}～{{Math.min(page*JSON_DIFF_PAGE,filtered.length)}} 项，共 {{filtered.length}} 项。</p><button type="button" :disabled="page===pages" @click="changePage(page+1)">下一页</button></nav>
    <ol ref="changeList" class="change-list" :start="(page-1)*JSON_DIFF_PAGE+1"><li v-for="(item,index) in visible" :key="item.path" :data-change-index="(page-1)*JSON_DIFF_PAGE+index" :aria-current="activeIndex===(page-1)*JSON_DIFF_PAGE+index?'true':undefined" tabindex="-1" :class="'change-'+item.kind"><p><strong>{{jsonChangeLabels[item.kind]}}</strong> · <code class="change-path">{{item.path||'（根节点，空指针）'}}</code></p><dl><div><dt>原值</dt><dd><pre>{{item.before??'（不存在）'}}</pre></dd></div><div><dt>新值</dt><dd><pre>{{item.after??'（不存在）'}}</pre></dd></div></dl></li></ol>
   </template>
   <p>路径使用 JSON Pointer：~0 表示 ~，~1 表示 /。新增/删除的对象或数组整体展示，不重复列出子项；结果不是 JSON Patch。</p>
   <button type="button" :aria-expanded="reportOpen" aria-controls="json-diff-report-panel" @click="toggleReport">{{reportOpen?'收起完整报告':'查看完整报告'}}</button>
   <div v-if="reportOpen" id="json-diff-report-panel"><label for="json-diff-report">结构对比报告（只读）</label><textarea id="json-diff-report" ref="reportEditor" :value="report" readonly rows="7" :spellcheck="false" /></div>
   <p>报告包含当前筛选的全部结果，不限于当前页，最多 1,000,000 个码元。</p><button type="button" :disabled="copying||composing" @click="copy">复制结构对比报告</button>
  </section>
 </section></ToolPageLayout>
</template>
<style scoped>
.json-side,.file-import{display:grid;gap:12px;min-width:0}.file-import p{margin:0}.json-diff-tool,.results {display:grid;gap:16px;min-width:0}.json-diff-tool{margin-block:24px}p{color:var(--color-muted);line-height:1.7;overflow-wrap:anywhere}label{display:grid;gap:8px;min-width:0;font-weight:650}.editors{display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
textarea{box-sizing:border-box;width:100%;min-width:0;max-width:100%;padding:16px;border:1px solid var(--color-control-border);border-radius:var(--ui-control-radius);background:var(--color-surface);color:var(--color-text);font:inherit;font-family:ui-monospace,monospace;line-height:1.6;resize:vertical}
input[type=search]{box-sizing:border-box;width:100%;min-width:0;min-height:44px;padding:8px 16px;border:1px solid var(--color-control-border);border-radius:var(--ui-control-radius);background:var(--color-surface);color:var(--color-text);font:inherit}.change-navigation{display:grid;gap:8px}.change-navigation p{margin:0}.change-list li[aria-current=true]{outline:3px solid var(--color-accent);outline-offset:3px;scroll-margin-block:100px}
button,select{box-sizing:border-box;min-height:44px;max-width:100%;min-width:0;padding:8px 16px;border:1px solid var(--color-control-border);border-radius:var(--ui-control-radius);background:var(--color-surface);color:var(--color-text);font:inherit}button{cursor:pointer;justify-self:start}button:disabled{opacity:.6;cursor:default}.primary-action{background:var(--color-accent);color:var(--color-on-accent);font-weight:650}.actions,.pagination{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.pagination p{flex:1 1 160px;margin:0}
.change-list{display:grid;gap:16px;padding-left:24px;min-width:0}.change-list li{padding:12px;border:1px solid var(--color-border);border-radius:var(--ui-control-radius);min-width:0}.change-list li>p{margin-top:0}.change-add{border-left:4px solid var(--color-accent)!important}.change-remove{border-left:4px solid #b3524b!important}.change-change{border-left:4px solid var(--color-muted)!important}.change-path{white-space:pre-wrap;overflow-wrap:anywhere}dl{display:grid;gap:12px;min-width:0;margin:0}dl>div{min-width:0}dt{font-weight:650}dd{margin:4px 0 0;min-width:0}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-family:ui-monospace,monospace}textarea:focus-visible,input:focus-visible,button:focus-visible,select:focus-visible,.change-list li:focus-visible{outline:3px solid var(--color-focus);outline-offset:3px}[role=status]{min-height:1.7em}
@media(min-width:768px){.editors,dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
