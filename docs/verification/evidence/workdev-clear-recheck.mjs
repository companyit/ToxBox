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

await send('Runtime.enable');
const observations=[];
await fill('clear verification');
await run('document.querySelector(".actions button:last-child").focus()');
observations.push({step:'before',detail:await run('({value:document.querySelector("textarea").value,focus:document.activeElement.outerHTML,disabled:document.querySelector(".actions button:last-child").disabled})')});
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await tick();
observations.push({step:'after Enter without text',detail:await run('({value:document.querySelector("textarea").value,focus:document.activeElement.tagName,focusId:document.activeElement.id,disabled:document.querySelector(".actions button:last-child").disabled,status:document.querySelector("#statistics-status").textContent,counts:[...document.querySelectorAll("dd")].map(n=>n.textContent)})')});
await shot('chrome-clear-enter-recheck');
await fill('second clear');await click('.actions button:last-child');
observations.push({step:'after mouse',detail:await run('({value:document.querySelector("textarea").value,focus:document.activeElement.tagName,focusId:document.activeElement.id,status:document.querySelector("#statistics-status").textContent,counts:[...document.querySelectorAll("dd")].map(n=>n.textContent)})')});
await fs.writeFile(`${dir}/chrome-clear-recheck.json`,JSON.stringify({date:new Date().toISOString(),observations},null,2));console.log(JSON.stringify(observations,null,2));ws.close();
