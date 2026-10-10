// 已安装Chrome的CDP真实浏览器检查，无新依赖；所有输入为合成测试文本。
import fs from 'node:fs/promises';
import os from 'node:os';
const dir=new URL('.',import.meta.url).pathname;
const base='http://127.0.0.1:4177';
const tabs=await(await fetch('http://127.0.0.1:9227/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let id=0;const pending=new Map(),events=[],results=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else if(['Fetch.requestPaused','Runtime.exceptionThrown','Runtime.consoleAPICalled','Log.entryAdded','Network.requestWillBeSent'].includes(m.method))events.push(m)};
function send(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.has(n)){pending.delete(n);reject(Error('timeout '+method))}},15000).unref()})}
async function run(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const tick=()=>run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
async function wait(expression){for(let i=0;i<100;i++){if(await run(expression)){await tick();return}await new Promise(r=>setTimeout(r,50))}throw Error('condition timeout '+expression)}
function assert(x,msg){if(!x)throw Error(msg)}
async function check(name,fn){try{results.push({name,status:'pass',detail:await fn()})}catch(e){results.push({name,status:'fail',error:String(e)})}}
async function direct(path,selector='h1'){await send('Page.navigate',{url:base+path});await wait(`document.readyState==='complete' && !!document.querySelector('#app')?.__vue_app__ && !!document.querySelector(${JSON.stringify(selector)})`)}
async function route(path){await run(`document.querySelector('#app').__vue_app__.config.globalProperties.$router.push(${JSON.stringify(path)})`);await tick()}
async function click(selector){await run(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const r=await run(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...r});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...r});await tick()}
async function button(label){const index=await run(`[...document.querySelectorAll('button')].findIndex(b=>b.textContent.trim()===${JSON.stringify(label)})`);assert(index>=0,'button '+label);await run(`document.querySelectorAll('button')[${index}].setAttribute('data-cdp-target','true')`);await click('[data-cdp-target]');await run(`document.querySelector('[data-cdp-target]')?.removeAttribute('data-cdp-target')`)}
async function fill(selector,text){await run(`document.querySelector(${JSON.stringify(selector)}).focus();document.querySelector(${JSON.stringify(selector)}).select()`);await send('Input.insertText',{text});await tick()}
async function value(selector){return run(`document.querySelector(${JSON.stringify(selector)}).value`)}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(dir+name+'.png',Buffer.from(r.data,'base64'))}
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Log.enable');
const browser=await send('Browser.getVersion');
for(const [path,input] of [['/office/text-statistics/','#statistics-input'],['/developer/json-formatter/','#json-input'],['/developer/url-encoder/','#url-input']])await check('E03 delayed client '+path,async()=>{
 const start=events.length;await send('Fetch.enable',{patterns:[{urlPattern:'*/assets/index-*.js',requestStage:'Request'}]});await send('Page.navigate',{url:base+path});
 let paused;for(let i=0;i<100;i++){paused=events.slice(start).find(e=>e.method==='Fetch.requestPaused');if(paused&&await run(`!!document.querySelector('${input}')`))break;await new Promise(r=>setTimeout(r,50))}
 assert(paused,'main script not intercepted');assert(await run(`document.querySelector('fieldset').disabled && !document.querySelector('#app').__vue_app__`),'not protected before hydration');
 await run(`document.querySelector('${input}').focus()`);await send('Input.insertText',{text:'SHOULD_NOT_ENTER'});assert(await value(input)==='','disabled input changed');
 await send('Fetch.continueRequest',{requestId:paused.params.requestId});await send('Fetch.disable');await wait(`!!document.querySelector('#app')?.__vue_app__ && !document.querySelector('fieldset').disabled`);
 assert(await value(input)==='','initial state changed');await fill(input,'abc');assert(await value(input)==='abc','permanently disabled');return {scriptIntercepted:true,preDisabled:true,blockedInput:true,postEnabled:true};
});
await fs.writeFile(dir+'delayed-results.json',JSON.stringify({date:new Date().toISOString(),browser,results},null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='pass').length,failures:results.filter(r=>r.status==='fail')},null,2));ws.close();if(results.some(r=>r.status==='fail'))process.exitCode=1;
