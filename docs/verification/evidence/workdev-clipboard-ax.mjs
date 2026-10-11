import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const dir=fileURLToPath(new URL('./',import.meta.url));
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

await send('Runtime.enable');await send('Page.enable');await send('Accessibility.enable');
const version=await send('Browser.getVersion');
await check('MAN-05 browser clipboard permission and API roundtrip',async()=>{
 await send('Browser.grantPermissions',{origin:'http://127.0.0.1:4173',permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await fill(' WORKDEV synthetic clipboard\n ');await click('.actions button:nth-child(2)');
 const status=await run('document.querySelector("#statistics-status").textContent');assert(status.includes('文本已复制'),'copy status '+status);
 const copied=await run('navigator.clipboard.readText()');assert(copied===' WORKDEV synthetic clipboard\n ','clipboard mismatch');
 return {status,copied,method:'Actual browser clipboard API, granted test-origin permissions; no external editor verification'};
});
const ax=await send('Accessibility.getFullAXTree');
const relevant=ax.nodes.filter(n=>['textbox','button','status','main','navigation'].includes(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value,properties:n.properties}));
await fs.writeFile(`${dir}/chrome-clipboard-and-ax.json`,JSON.stringify({date:new Date().toISOString(),browser:version,results,accessibility:relevant},null,2));console.log(JSON.stringify({results,accessibility:relevant},null,2));ws.close();
