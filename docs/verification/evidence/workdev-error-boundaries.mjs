import fs from 'node:fs/promises';
import os from 'node:os';
const dir='/Users/user/development/ToxBox/ToxBox/docs/verification/evidence';
await fs.mkdir(dir,{recursive:true});
const tabs=await (await fetch('http://127.0.0.1:9223/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let id=0;const pending=new Map();const events=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else if(['Runtime.exceptionThrown','Log.entryAdded','Network.requestWillBeSent'].includes(m.method))events.push(m)};
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.has(n)){pending.delete(n);reject(Error('timeout '+method))}},15000).unref()})}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const tick=()=>run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
const results=[];
async function check(name,fn){try{const detail=await fn();results.push({name,status:'pass',detail});}catch(e){results.push({name,status:'fail',error:String(e)})}}
function assert(x,message){if(!x)throw Error(message)}
async function click(selector){await run(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const r=await run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});await tick()}
async function fill(text){await run('document.querySelector("textarea").focus();document.querySelector("textarea").select()');await send('Input.insertText',{text});await tick()}
async function values(){return run('[...document.querySelectorAll("#text-statistics dd")].map(x=>x.textContent.trim())')}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(`${dir}/${name}.png`,Buffer.from(r.data,'base64'))}


await send('Runtime.enable');await send('Page.enable');
await check('MAN-09 excess input clipboard fallback',async()=>{
 await fill('a'.repeat(100001));await run('Object.defineProperty(navigator,"clipboard",{configurable:true,value:undefined})');
 await click('.actions button:nth-child(2)');const d=await run('({length:document.querySelector("textarea").value.length,start:document.querySelector("textarea").selectionStart,end:document.querySelector("textarea").selectionEnd,status:document.querySelector("#statistics-status").textContent})');
 assert(d.length===100001&&d.start===0&&d.end===100001&&d.status.includes('手动复制')&&d.status.includes('输入超过'),'combined error');await run('delete navigator.clipboard');return d;
});
await check('MAN-09 runtime calculation exception preserves input and recovers',async()=>{
 await run(`window.__originalStringIterator=String.prototype[Symbol.iterator];String.prototype[Symbol.iterator]=function(){if(String(this)==='WORKDEV_CALC_FAILURE')throw new Error('test-only');return window.__originalStringIterator.call(this)}`);
 await fill('WORKDEV_CALC_FAILURE');const d=await run('({value:document.querySelector("textarea").value,status:document.querySelector("#statistics-status").textContent,counts:[...document.querySelectorAll("dd")].map(n=>n.textContent)})');
 await run('String.prototype[Symbol.iterator]=window.__originalStringIterator;delete window.__originalStringIterator');
 assert(d.value==='WORKDEV_CALC_FAILURE'&&d.status.includes('暂时无法统计')&&d.counts.every(v=>v==='—'),'exception guard');
 await fill('abc');const recovered=await values();assert(recovered[0]==='3','recovery');return {...d,recovered};
});
await fs.writeFile(`${dir}/chrome-error-boundaries.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));console.log(JSON.stringify(results,null,2));ws.close();
