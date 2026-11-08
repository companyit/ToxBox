// 本地验收采样：JS响应体字节，不是用户内容统计或网络速度基准。
import fs from 'node:fs/promises'
import path from 'node:path'
import { preview } from 'vite'
import { chromium, webkit } from '@playwright/test'
const label=process.argv[2]
if(!['before','after'].includes(label))throw Error('请指定before或after')
const origin='http://127.0.0.1:4177',results=[]
const server=await preview({configLoader:'native',build:{outDir:'dist-ssg'},preview:{host:'127.0.0.1',port:4177,strictPort:true}})
try{
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch()
  try{
   for(const route of ['image-convert','image-crop']){
    const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),jobs=[],resources=[],external=[]
    await context.route('**/*',r=>{const u=r.request().url();if(u.startsWith(origin+'/')||u.startsWith('blob:'))return r.continue();external.push(u);return r.abort()})
    page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('.js'))jobs.push(response.body().then(bytes=>resources.push({path:new URL(response.url()).pathname,bytes:bytes.length,status:response.status()})))})
    await page.goto(origin+'/office/'+route+'/');await page.waitForFunction(()=>Boolean(document.querySelector('#app')?.__vue_app__))
    await Promise.all(jobs);const initial=[...resources]
    const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=40;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,80,40);return Array.from(Uint8Array.from(atob(c.toDataURL().split(',')[1]),s=>s.charCodeAt(0)))})
    await page.getByLabel(route==='image-convert'?'选择或追加图片':'选择待裁剪图片',{exact:true}).setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png)})
    if(route==='image-convert'){await page.getByRole('button',{name:'开始处理',exact:true}).click();await page.getByRole('status').filter({hasText:'处理完成'}).waitFor()}
    else{await page.getByRole('status').filter({hasText:'图片已就绪'}).waitFor();await page.getByRole('button',{name:'生成裁剪图片',exact:true}).click();await page.getByRole('status').filter({hasText:'生成完成'}).waitFor()}
    await Promise.all(jobs)
    results.push({browser:name,version:browser.version(),route,initialJs:initial,initialBytes:initial.reduce((n,r)=>n+r.bytes,0),taskJs:resources.slice(initial.length),totalJsBytes:resources.reduce((n,r)=>n+r.bytes,0),external})
    if(external.length||resources.some(r=>r.status!==200))throw Error('资源请求不符合本地验收预期')
    await context.close()
   }
  }finally{await browser.close()}
 }
 const target=path.resolve('docs/verification/evidence/image-performance/'+label+'-requests.json');await fs.writeFile(target,JSON.stringify(results,null,2))
 console.log(JSON.stringify(results.map(({browser,route,initialBytes,totalJsBytes,external})=>({browser,route,initialBytes,totalJsBytes,external})),null,2))
}finally{await server.close()}
