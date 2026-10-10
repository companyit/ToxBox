// 初步观察：源码转译纯函数与生产页面DOM更新代理；不是物理屏幕绘制或手机验收。
import fs from 'node:fs/promises'
import os from 'node:os'
import crypto from 'node:crypto'
import ts from 'typescript'
const source=await fs.readFile(new URL('../../../../src/utils/urlEncoder.ts',import.meta.url),'utf8')
const script=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const tabs=await(await fetch('http://127.0.0.1:9225/json')).json()
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject})
let id=0;const pending=new Map()
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}}
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const browser=await send('Browser.getVersion')
const observations=await evaluate(`(async()=>{
 const script=${JSON.stringify(script)};
 const blob=URL.createObjectURL(new Blob([script],{type:'text/javascript'}));
 const pure=await import(blob);URL.revokeObjectURL(blob);
 const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const input=document.querySelector('#url-input'),select=document.querySelector('#url-mode');
 const buttons=document.querySelectorAll('#url-encoder .actions button');
 const cases=[];
 for(const size of [10000,100000]) for(const mode of ['component','uri']) for(const [name,action,fragment] of [['ascii','encode','a b?&='],['unicode','encode','你😀 a'],['percent-utf8','decode','%E4%BD%A0%F0%9F%98%80%20%2F']]){
   const sample=fragment.repeat(Math.floor(size/fragment.length))+'a'.repeat(size%fragment.length);
   const pureMs=[],eventToTwoRafMs=[];
   for(let i=0;i<10;i++){
     let start=performance.now();const result=pure.processUrl({input:sample,mode,action});pureMs.push(performance.now()-start);if(result.status!=='ok')throw Error('sample failed');
     select.value=mode;select.dispatchEvent(new Event('change',{bubbles:true}));input.value=sample;input.dispatchEvent(new Event('input',{bubbles:true}));await wait();
     start=performance.now();buttons[action==='encode'?0:1].click();await wait();eventToTwoRafMs.push(performance.now()-start);
     if(document.querySelector('#url-output').value!==result.output)throw Error('page result mismatch');
   }
   cases.push({size,mode,action,sample:name,fragment,length:sample.length,pureMs,eventToTwoRafMs,maxPureMs:Math.max(...pureMs),maxEventToTwoRafMs:Math.max(...eventToTwoRafMs)});
 }
 return {cases,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},visibility:document.visibilityState};
})()`)
const record={date:new Date().toISOString(),browser,system:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model},sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),method:'performance.now in real headless Chrome. Pure function from existing TypeScript source transpiled with installed TypeScript and imported as temporary Blob module; page timing from synthetic DOM button.click to second requestAnimationFrame including Vue update. Not exact physical paint; no warmup filtering; 10 iterations per case; not mobile or full performance acceptance.',...observations}
await fs.writeFile(new URL('performance-observations.json',import.meta.url),JSON.stringify(record,null,2)+'\n')
console.log(JSON.stringify({cases:observations.cases.length,samplesEach:10,maxPureMs:Math.max(...observations.cases.map(x=>x.maxPureMs)),maxEventToTwoRafMs:Math.max(...observations.cases.map(x=>x.maxEventToTwoRafMs)),browser:browser.product},null,2));ws.close()
