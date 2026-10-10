// 已安装Chrome的CDP真实浏览器检查，无新依赖；所有输入为合成测试文本。
import fs from 'node:fs/promises';
import os from 'node:os';
const dir=new URL('.',import.meta.url).pathname;
const base='http://127.0.0.1:4177';
const tabs=await(await fetch('http://127.0.0.1:9227/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let id=0;const pending=new Map(),events=[],results=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}}else if(['Runtime.exceptionThrown','Runtime.consoleAPICalled','Log.entryAdded','Network.requestWillBeSent'].includes(m.method))events.push(m)};
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
const paths=['/','/office/','/office/text-statistics/','/developer/','/developer/json-formatter/','/developer/url-encoder/','/about/','/privacy/','/office/missing/','/developer/missing/','/404.html'];
for(const path of paths) await check('E01 JavaScript disabled '+path,async()=>{
 await send('Emulation.setScriptExecutionDisabled',{value:true});await send('Page.navigate',{url:base+path});for(let i=0;i<100;i++){if(await run(`document.readyState==='complete'&&!!document.querySelector('h1')`))break;await new Promise(r=>setTimeout(r,50))}
 const actual=await run(`({title:document.title,h1:document.querySelector('h1').textContent,main:document.querySelectorAll('main').length,body:document.querySelector('main').textContent.length,ready:!!document.querySelector('#app')?.__vue_app__,disabled:document.querySelector('fieldset')?.disabled,canonical:document.querySelectorAll('[rel=canonical]').length,robots:document.querySelector('[name=robots]').content})`);
 assert(actual.main===1&&actual.body>20&&!actual.ready&&!actual.canonical&&actual.robots==='noindex,follow','static DOM');if(path.includes('missing')||path==='/404.html')assert(actual.h1==='页面不存在','404');return actual;
});
await send('Emulation.setScriptExecutionDisabled',{value:false});
const capture=await send('Page.addScriptToEvaluateOnNewDocument',{source:`new MutationObserver((_,observer)=>{const h=document.querySelector('main h1');if(h){window.__ssgH1=h;window.__ssgMain=document.querySelector('main');window.__ssgDisabled=document.querySelector('fieldset')?.disabled;observer.disconnect()}}).observe(document,{childList:true,subtree:true});`});
for(const path of paths) await check('E02/E03 hydration identity '+path,async()=>{
 const start=events.length;await direct(path);await tick();const actual=await run(`({h1Same:window.__ssgH1===document.querySelector('h1'),mainSame:window.__ssgMain===document.querySelector('main'),preDisabled:window.__ssgDisabled,postDisabled:document.querySelector('fieldset')?.disabled,main:document.querySelectorAll('main').length})`);
 const diagnostics=events.slice(start).filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&JSON.stringify(e).match(/hydration|mismatch/i)));
 assert(actual.h1Same&&actual.mainSame&&actual.main===1&&!actual.postDisabled&&!diagnostics.length,'hydration '+JSON.stringify({actual,diagnostics}));return actual;
});
await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:capture.identifier});
await check('E08 negative control detects hydration mismatch',async()=>{
 const hook=await send('Page.addScriptToEvaluateOnNewDocument',{source:`new MutationObserver((_,o)=>{const h=document.querySelector('#app > a');if(h){o.disconnect();const x=document.createElement('aside');x.textContent='INTENTIONAL NEGATIVE CONTROL';h.replaceWith(x)}}).observe(document,{childList:true,subtree:true})`});
 const start=events.length;await direct('/about/');await tick();await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:hook.identifier});const warnings=events.slice(start).filter(e=>e.method==='Runtime.consoleAPICalled'&&/hydration|mismatch/i.test(JSON.stringify(e)));assert(warnings.length>0,'detector missed mismatch');return {expectedMismatchDetected:true,warnings};
});
await direct('/about/');await shot('ssg-about');
await fs.writeFile(dir+'hydration-results.json',JSON.stringify({date:new Date().toISOString(),browser,results},null,2));await fs.writeFile(dir+'hydration-events.json',JSON.stringify(events,null,2));console.log(JSON.stringify({passed:results.filter(r=>r.status==='pass').length,failures:results.filter(r=>r.status==='fail')},null,2));ws.close();if(results.some(r=>r.status==='fail'))process.exitCode=1;
