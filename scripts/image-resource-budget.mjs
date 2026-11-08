import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
export const imageResourceBudgets = Object.freeze({shared:32*1024,cropWorker:32*1024,convertWorker:160*1024})
export async function collectImageResourceSizes(directory='dist-ssg',manifestPath='.ssg-build/client/.vite/ssr-manifest.json') {
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'))
 const shared=[...new Set((manifest['src/utils/imageConvert.ts']??[]).filter(p=>p.endsWith('.js')))]
 assert(shared.length>0,'图片校验模块没有可定位的构建资源')
 const assets=await fs.readdir(path.join(directory,'assets'))
 const find=prefix=>{const files=assets.filter(n=>n.startsWith(prefix)&&n.endsWith('.js'));assert.equal(files.length,1,`${prefix}资源集合不明确`);return '/assets/'+files[0]}
 const pdfModules=Object.entries(manifest).filter(([key,files])=>key.startsWith('node_modules/pdf-lib/')&&files.some(file=>shared.includes(file))).map(([key])=>key)
 const groups={shared,cropWorker:[find('imageCrop.worker-')],convertWorker:[find('imageConvert.worker-')]},result={}
 for(const [name,files] of Object.entries(groups)){
  const rows=await Promise.all(files.map(async resource=>{assert(/^\/assets\/[A-Za-z0-9_.-]+\.js$/.test(resource),'非法构建资源');const bytes=await fs.readFile(path.join(directory,resource.slice(1)));return {resource,bytes:bytes.length,gzipBytes:gzipSync(bytes,{level:9}).length}}))
  result[name]={files:rows,bytes:rows.reduce((n,r)=>n+r.bytes,0),gzipBytes:rows.reduce((n,r)=>n+r.gzipBytes,0)}
 }
 return {...result,pdfModules}
}
export function validateImageResourceBudgets(metrics){
 for(const [name,budget] of Object.entries(imageResourceBudgets))assert(Number.isFinite(metrics[name]?.bytes)&&metrics[name].bytes>0&&metrics[name].bytes<=budget,`${name}超过${budget}字节预算或结果无效`)
 assert.equal(metrics.pdfModules.length,0,'纯图片校验模块不应加载PDF生成库')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const result=await collectImageResourceSizes();validateImageResourceBudgets(result);console.log(JSON.stringify(result,null,2))}
