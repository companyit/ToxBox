<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { validateRedactInputs, RedactFailure, redactErrors, type RedactCode, type RedactField } from '@/utils/jsonRedact'
const source=ref(''),paths=ref('[]'),replacement=ref('***'),output=ref(''),count=ref(0)
const busy=ref(false),composing=ref(false),copying=ref(false),message=ref(''),error=ref(''),errorField=ref('')
const sourceEditor=ref<HTMLTextAreaElement>(),resultEditor=ref<HTMLTextAreaElement>()
let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,version=0,disposed=false,downloadUrl=''
function releaseDownload(){if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=''}
function invalidate(){version++;worker?.terminate();worker=undefined;clearTimeout(timer);busy.value=false;output.value='';count.value=0;message.value='';error.value='';errorField.value='';releaseDownload()}
watch([source,paths,replacement],invalidate,{flush:'sync'})
function fail(data:{code?:RedactCode;field?:RedactField;item?:number;line?:number;column?:number}){
 errorField.value=data.field??'source'
 error.value=({source:'源 JSON：',paths:'路径配置：',replacement:'替换文本：'}[errorField.value as RedactField]??'')+(data.item?`第 ${data.item} 项：`:'')+(data.line?`第 ${data.line} 行，第 ${data.column} 列：`:'')+(redactErrors[data.code??'failed']??redactErrors.failed)
}
function run(){
 if(busy.value||composing.value)return
 invalidate()
 try{validateRedactInputs(source.value,paths.value,replacement.value)}catch(failure){fail(failure instanceof RedactFailure?failure:{code:'failed'});return}
 const revision=version;busy.value=true;message.value='正在本地处理指定路径…'
 try{
  worker=new Worker(new URL('../../workers/jsonRedact.worker.ts',import.meta.url),{type:'module'})
  timer=setTimeout(()=>{if(revision===version){invalidate();message.value='处理超过 10 秒，已停止，请减少内容后重试。'}},10000)
  worker.onerror=()=>{if(revision===version){invalidate();fail({code:'failed'})}}
  worker.onmessage=event=>{if(revision!==version)return;const data=event.data;invalidate();if(!data.ok){fail(data);return}output.value=data.output;count.value=data.count;message.value='处理完成，请检查未指定字段是否还包含敏感信息。'}
  worker.postMessage({source:source.value,paths:paths.value,replacement:replacement.value})
 }catch{invalidate();fail({code:'failed'})}
}
function cancel(){invalidate();message.value='已取消，输入与设置保持不变。'}
function release(){composing.value=false;source.value='';paths.value='[]';replacement.value='***';invalidate()}
function clear(){if(composing.value)return;release();sourceEditor.value?.focus()}
function example(){
 if(composing.value)return
 if(source.value||paths.value!=='[]'||replacement.value!=='***'){error.value='';errorField.value='';message.value='请先清空现有内容和设置，再填入示例。';return}
 source.value='{\n  "id": 9007199254740993,\n  "data": {"email": "example@domain.com", "name": "示例"},\n  "users": [{"phone": "13800138000", "active": true}]\n}'
 paths.value='["/data/email", "/users/0/phone"]';sourceEditor.value?.focus()
}
async function copy(){
 if(!output.value||copying.value||composing.value)return
 const revision=version,snapshot=output.value;copying.value=true
 try{if(!window.isSecureContext||!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(snapshot);if(!disposed&&revision===version)message.value='结果已复制。'}
 catch{if(!disposed&&revision===version){message.value='无法自动复制，请选中结果后手动复制。';resultEditor.value?.focus();resultEditor.value?.select()}}
 finally{if(!disposed)copying.value=false}
}
function download(){
 if(!output.value||composing.value)return
 let link:HTMLAnchorElement|undefined
 try{if(!downloadUrl)downloadUrl=URL.createObjectURL(new Blob([output.value],{type:'application/json;charset=utf-8'}));link=document.createElement('a');link.href=downloadUrl;link.download='redacted.json';link.hidden=true;document.body.append(link);link.click();message.value='已请求浏览器下载，请确认实际保存。'}
 catch{releaseDownload();message.value='无法启动下载，请重试或复制结果后保存。'}finally{link?.remove()}
}
function compositionStart(){composing.value=true;invalidate()}
onMounted(()=>window.addEventListener('pagehide',release))
onBeforeUnmount(()=>{disposed=true;window.removeEventListener('pagehide',release);release()})
</script>
<template>
 <ToolPageLayout page-name="json-redact"><section class="redact-tool" aria-label="JSON字段脱敏操作">
  <p id="redact-help">只替换明确指定的路径，不自动识别或保证移除全部敏感信息，请检查结果。选中的值或整个容器会变成替换字符串；未选字段保持原值，数字保留原始精度。严格 JSON，不支持 BOM、注释、尾逗号或重复字段。</p>
  <p id="redact-limits">源 JSON 最多 100,000 个码元、30 层、50,000 节点；路径配置最多 10,000 码元、100 条路径，每条 1,000 码元；结果最多 1,000,000 码元。10 秒保护，可取消，仅本地处理，不上传或自动保存；本页无统计或广告。</p>
  <label for="redact-source">源 JSON</label><textarea id="redact-source" ref="sourceEditor" v-model="source" rows="10" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="errorField==='source'" aria-describedby="redact-help redact-limits redact-status" @compositionstart="compositionStart" @compositionend="composing=false" />
  <label for="redact-paths">目标路径（JSON 字符串数组）</label><textarea id="redact-paths" v-model="paths" rows="3" autocomplete="off" autocapitalize="off" :spellcheck="false" :aria-invalid="errorField==='paths'" aria-describedby="redact-path-help redact-status" @compositionstart="compositionStart" @compositionend="composing=false" />
  <p id="redact-path-help">例如 ["/data/email", "/users/0/phone"]。JSON Pointer 中 ~0 表示 ~，~1 表示 /；空字符串路径 "" 替换整个根值。数组下标不含前导零，不支持通配符。路径缺失、重复或祖先/后代重叠时整次失败。</p>
  <label for="redact-replacement">替换文本</label><input id="redact-replacement" v-model="replacement" type="text" autocomplete="off" :spellcheck="false" :aria-invalid="errorField==='replacement'" aria-describedby="redact-replacement-help redact-status" @compositionstart="compositionStart" @compositionend="composing=false" />
  <p id="redact-replacement-help">最多 200 个码元，允许空字符串；所有选中值都替换成 JSON 字符串，不保留原类型。</p>
  <div class="actions"><button class="primary-action" type="button" :disabled="busy||composing" @click="run">执行字段脱敏</button><button v-if="busy" type="button" @click="cancel">取消处理</button><button type="button" :disabled="composing" @click="example">填入示例</button><button type="button" :disabled="composing" @click="clear">清空</button></div>
  <div id="redact-status" role="status" aria-live="polite"><p>{{error||message}}</p><p v-if="output">已替换 {{count}} 个目标。</p></div>
  <label for="redact-result">脱敏结果（只读）</label><textarea id="redact-result" ref="resultEditor" :value="output" readonly rows="10" :spellcheck="false" />
  <div class="actions"><button type="button" :disabled="!output||copying||composing" @click="copy">复制脱敏结果</button><button type="button" :disabled="!output||composing" @click="download">下载脱敏 JSON</button></div>
  <p>下载为 UTF-8 的 redacted.json，不额外添加 BOM 或换行，内容与结果框一致。系统保存和剪贴板由你管理。</p>
 </section></ToolPageLayout>
</template>
<style scoped>
.redact-tool{display:grid;gap:16px;min-width:0;margin-block:24px}p{color:var(--color-muted);line-height:1.7;overflow-wrap:anywhere}label{font-weight:650}textarea,input,button{box-sizing:border-box;min-width:0;max-width:100%;border:1px solid var(--color-control-border);border-radius:var(--ui-control-radius);background:var(--color-surface);color:var(--color-text);font:inherit}textarea,input{width:100%;padding:12px}textarea{font-family:ui-monospace,monospace;line-height:1.6;resize:vertical}input,button{min-height:44px}button{padding:8px 16px;cursor:pointer;justify-self:start}button:disabled{opacity:.6;cursor:default}.primary-action{background:var(--color-accent);color:var(--color-on-accent);font-weight:650}.actions{display:flex;flex-wrap:wrap;gap:12px}[role=status]{min-height:1.7em}textarea:focus-visible,input:focus-visible,button:focus-visible{outline:3px solid var(--color-focus);outline-offset:3px}
</style>
