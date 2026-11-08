<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { validateConvertFiles, validateConvertOptions, convertErrors, type ImageFormat, type ConvertCode } from '@/utils/imageConvert'
const files=ref<File[]>([]),format=ref<ImageFormat>('jpeg'),quality=ref(80),maxSide=ref(1920),busy=ref(false),status=ref('请选择本地图片。'),picker=ref<HTMLInputElement>()
type Result={name:string;url:string;size:number;originalBytes:number;width:number;height:number}
const results=ref<Result[]>([]),archiveUrl=ref('')
let worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,version=0
function invalidate(){version++;worker?.terminate();worker=undefined;clearTimeout(timer);busy.value=false;for(const item of results.value)URL.revokeObjectURL(item.url);results.value=[];if(archiveUrl.value)URL.revokeObjectURL(archiveUrl.value);archiveUrl.value=''}
watch([format,quality,maxSide],()=>{invalidate();status.value='设置已更新，请重新处理。'},{flush:'sync'})
function release(){invalidate();files.value=[];if(picker.value)picker.value.value='';status.value='已清空。'}
function clear(){release();picker.value?.focus()}
function select(event:Event){const input=event.target as HTMLInputElement,added=Array.from(input.files??[]);input.value='';if(!added.length)return;invalidate();try{const next=[...files.value,...added];validateConvertFiles(next);files.value=next;status.value='图片已选择，点击开始处理。'}catch(error){status.value=convertErrors[(error as {code:ConvertCode}).code]??convertErrors.failed}}
function remove(index:number){if(busy.value)return;invalidate();files.value.splice(index,1);status.value='图片已移除，请重新处理。'}
function cancel(){invalidate();status.value='已取消，可调整设置后重试。'}
function run(){
 invalidate();const revision=version
 const options={format:format.value,quality:Number(quality.value),maxSide:Number(maxSide.value)}
 try{
  validateConvertFiles(files.value);validateConvertOptions(options)
  busy.value=true;status.value='正在处理 0 张图片…'
  worker=new Worker(new URL('../../workers/imageConvert.worker.ts',import.meta.url),{type:'module'})
  timer=setTimeout(()=>{if(revision===version){invalidate();status.value='处理超过 60 秒，已停止，请减少图片后重试。'}},60000)
  worker.onerror=()=>{if(revision===version){invalidate();status.value=convertErrors.failed}}
  worker.onmessage=event=>{
   if(revision!==version)return
   const data=event.data
   if('progress' in data){status.value=`正在处理 ${data.progress} / ${data.total} 张图片…`;return}
   invalidate()
   if(!data.ok){status.value=convertErrors[data.code as ConvertCode]??convertErrors.failed;return}
   try{
    for(const result of data.results)results.value.push({...result,blob:undefined,url:URL.createObjectURL(result.blob),size:result.blob.size})
    archiveUrl.value=URL.createObjectURL(new Blob([data.archive],{type:'application/zip'}))
    status.value='处理完成，请核对体积与图片效果后下载。'
   }catch{invalidate();status.value=convertErrors.failed}
  }
  worker.postMessage({files:[...files.value],options})
 }catch(error){invalidate();status.value=convertErrors[(error as {code:ConvertCode}).code]??convertErrors.capability}
}
function size(bytes:number){return `${(bytes/1024).toFixed(1)} KiB`}
function change(item:Result){const percent=(1-item.size/item.originalBytes)*100;return percent>=0?`减少 ${percent.toFixed(1)}%`:`增大 ${(-percent).toFixed(1)}%`}
onMounted(()=>window.addEventListener('pagehide',release))
onBeforeUnmount(()=>{window.removeEventListener('pagehide',release);release()})
</script>
<template>
 <ToolPageLayout page-name="image-convert"><section class="convert-controls" aria-label="图片转换操作">
  <p id="convert-rules">本地处理，不上传或保存。最多 10 张静态 JPG/PNG/WebP，每张 10 MiB，总计 50 MiB；单边最多 10000 像素、每张 2000 万、合计 6000 万像素。不支持动画、SVG、HEIC、隔行 PNG 或 CMYK JPEG。</p>
  <label for="convert-files">选择或追加图片</label><input id="convert-files" ref="picker" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple :disabled="busy" aria-describedby="convert-rules" @change="select">
  <ol v-if="files.length" class="selected-images"><li v-for="(file,index) in files" :key="index"><span>{{ file.name }} · {{ size(file.size) }}</span><button type="button" :disabled="busy" :aria-label="`移除第 ${index+1} 张图片`" @click="remove(index)">移除</button></li></ol>
  <div class="convert-options">
   <label>输出格式<select aria-label="输出格式" v-model="format" :disabled="busy"><option value="webp">WebP</option><option value="jpeg">JPG（白底）</option><option value="png">PNG（保留透明）</option></select></label>
   <label>质量（10～100）<input v-model.number="quality" type="number" min="10" max="100" step="1" :disabled="busy || format==='png'" aria-describedby="quality-note"></label>
   <label>最长边（像素）<input v-model.number="maxSide" type="number" min="1" max="10000" step="1" :disabled="busy"></label>
  </div>
  <p id="quality-note">只缩小、不放大，保持比例，不裁剪。部分浏览器不支持 WebP 输出，可改用 JPG/PNG。PNG 无损编码不使用质量参数；JPG/WebP 为有损输出，文件可能变大。透明图片转 JPG 铺白底，PNG/WebP 保留透明；输出不复制原始 EXIF/GPS，不保证色彩配置或原始画质。</p>
  <div class="actions"><button class="primary-action" type="button" :disabled="busy || !files.length" @click="run">开始处理</button><button v-if="busy" type="button" @click="cancel">取消处理</button><button type="button" @click="clear">清空</button><a v-if="archiveUrl" :href="archiveUrl" download="converted-images.zip">打包下载 ZIP</a></div>
  <p role="status" aria-live="polite">{{ status }}</p>
  <section v-if="results.length" aria-labelledby="convert-results"><h2 id="convert-results">处理结果</h2><ul class="convert-results"><li v-for="item in results" :key="item.name"><img :src="item.url" :alt="`${item.name} 结果预览`"><div><h3>{{ item.name }}</h3><p>{{ item.width }} × {{ item.height }} 像素</p><p>原始 {{ size(item.originalBytes) }} → 输出 {{ size(item.size) }} · {{ change(item) }}</p><a :href="item.url" :download="item.name">下载 {{ item.name }}</a></div></li></ul></section>
  <p>最长等待 60 秒，可随时取消；输出合计最多 100 MiB。更改设置或文件会清除结果链接，请先完成下载。本站不保存历史。</p>
 </section></ToolPageLayout>
</template>
<style scoped>
.convert-controls { display: grid; gap: 16px; margin-block: 24px; min-width: 0; }
p { color: var(--color-muted); overflow-wrap: anywhere; } label { display: grid; gap: 8px; font-weight: 650; min-width: 0; }
.convert-options { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,180px),1fr)); gap: 16px; }
input,select { width: 100%; min-width: 0; max-width: 100%; }
button,input[type=number],select { border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; padding: 8px 12px; min-height: 44px; }
button { cursor: pointer; } button:disabled,input:disabled,select:disabled { opacity: .6; cursor: default; }
.primary-action { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); font-weight: 650; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; } a { display: inline-flex; align-items: center; min-height: 44px; }
.selected-images { padding-left: 24px; } .selected-images li { overflow-wrap: anywhere; padding-block: 8px; } .selected-images button { margin-left: 12px; }
.convert-results { display: grid; gap: 16px; padding: 0; list-style: none; margin-top: 16px; }
.convert-results li { display: flex; flex-wrap: wrap; gap: 16px; padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; overflow-wrap: anywhere; }
.convert-results img { width: 96px; height: 96px; object-fit: contain; background: var(--color-surface); border: 1px solid var(--color-border); }
.convert-results li div { min-width: 0; flex: 1 1 180px; } h3 { font-size: 1rem; }
input:focus-visible,select:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
