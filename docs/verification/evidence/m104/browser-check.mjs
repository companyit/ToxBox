import fs from 'node:fs/promises';
import os from 'node:os';
const dir=new URL('.',import.meta.url).pathname;
await fs.mkdir(dir,{recursive:true});
const tabs=await (await fetch('http://127.0.0.1:9225/json')).json();
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
async function fill(text){await run('document.querySelector("#url-input").focus();document.querySelector("#url-input").select()');await send('Input.insertText',{text});await tick()}
async function values(){return run('[...document.querySelectorAll("#text-statistics dd")].map(x=>x.textContent.trim())')}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(`${dir}/${name}.png`,Buffer.from(r.data,'base64'))}
await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
const version=await send('Browser.getVersion');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:4175/'});
for(let i=0;i<60;i++){if(await run('!!document.querySelector(".tool-toggle")'))break;await new Promise(r=>setTimeout(r,100))}
await tick();
const toggle='#url-encoder > .tool-toggle';
const action=n=>`#url-encoder .actions button:nth-of-type(${n})`;
const copy='#url-encoder .actions:last-child button';
const output=()=>run('document.querySelector("#url-output").value');
const status=()=>run('document.querySelector("#url-status").textContent');
async function mode(value){await run(`document.querySelector('#url-mode').value=${JSON.stringify(value)};document.querySelector('#url-mode').dispatchEvent(new Event('change',{bubbles:true}))`);await tick()}
async function key(key,code,vk,text){await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk,...(text?{text}: {})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});await tick()}
await click(toggle);
await check('B01 empty is not an error, whitespace is content',async()=>{
 for(const n of [1,2]){await click(action(n));assert(await output()===''&&await status()==='','empty');assert(await run('document.querySelector("#url-input").getAttribute("aria-invalid")')===null,'empty error')}
 await fill(' ');await click(action(1));assert(await output()==='%20','space');return {emptyNoError:true,space:'%20'};
});
await check('B01 four operations, Unicode, separators, plus and case',async()=>{
 const cases=[['component',1,'你好 😀 /?+','%E4%BD%A0%E5%A5%BD%20%F0%9F%98%80%20%2F%3F%2B'],['uri',1,'https://example.com/你?q=a+b#好','https://example.com/%E4%BD%A0?q=a+b#%E5%A5%BD'],['component',2,'%2f%3f%23%41+%20%2B','/?#A+ +'],['uri',2,'%2f%3f%23%41+%20%2B','%2f%3f%23A+ %2B']];
 const rows=[];for(const [m,n,input,expected]of cases){await mode(m);await fill(input);await click(action(n));const actual=await output();assert(actual===expected,JSON.stringify({input,actual,expected}));rows.push({mode:m,input,actual})}return rows;
});
await check('B01 single-pass and action/mode/edit invalidation',async()=>{
 await mode('component');await fill('%252F');await click(action(2));assert(await output()==='%2F','first');await click(action(2));assert(await output()==='%2F','not recursive');await mode('uri');assert(await output()==='','mode stale');await fill('%');await click(action(1));assert(await output()==='%25','encode percent');await click(action(2));assert(await output()===''&&(await status()).includes('无法解码'),'action failure');await fill('new');assert(await output()===''&&await status()==='','edit stale');return {singlePass:true,invalidation:true};
});
await check('B01 malformed percent and invalid UTF8 preserve input clear output',async()=>{
 const rows=[];for(const m of ['component','uri']){await mode(m);for(const input of ['%','%2','%GG','%E4%BD','%C0%AF','%ED%A0%80','%F4%90%80%80']){await fill(input);await click(action(2));const d={mode:m,input:await run('document.querySelector("#url-input").value'),output:await output(),status:await status()};assert(d.input===input&&d.output===''&&d.status.includes('无法解码'),'invalid UTF8');rows.push(d)}}return rows;
});
await check('B01 raw surrogate fault input and native semantics',async()=>{
 await run('document.querySelector("#url-input").value=String.fromCharCode(0xd800);document.querySelector("#url-input").dispatchEvent(new Event("input",{bubbles:true}))');await tick();await click(action(1));assert(await output()===''&&(await status()).includes('孤立'),'surrogate encode');await click(action(2));const d=await run('({length:document.querySelector("#url-output").value.length,code:document.querySelector("#url-output").value.charCodeAt(0)})');assert(d.length===1&&d.code===0xd800,'surrogate decode');return {injectedInput:true,...d};
});
await check('B01 size boundary excess and recovery',async()=>{
 const rows=[];await mode('component');for(const input of ['a'.repeat(100000),'a'.repeat(100001),'😀'.repeat(50000),'😀'.repeat(50000)+'a']){await fill(input);await click(action(1));const d=await run('({length:document.querySelector("#url-input").value.length,outputLength:document.querySelector("#url-output").value.length,disabled:document.querySelector("#url-encoder .actions button").disabled,status:document.querySelector("#url-status").textContent})');assert(d.length===input.length,'truncated');assert(input.length>100000?d.outputLength===0&&d.disabled:d.outputLength>0&&!d.disabled,'limit');rows.push(d)}await fill('abc');await click(action(1));assert(await output()==='abc','recovery');return rows;
});
await check('B02 example guard keyboard Space encode Enter clear focus',async()=>{
 await click(action(4));await click(action(3));assert(await run('document.querySelector("#url-input").value')==='你好 world 😀'&&await output()==='','sample');await fill(' ');assert(await run(`document.querySelector('${action(3)}').disabled`),'guard');await run(`document.querySelector('${action(1)}').focus()`);await key(' ','Space',32,' ');assert(await output()==='%20','space key');await run(`document.querySelector('${action(4)}').focus()`);await key('Enter','Enter',13,'\r');const d=await run('({value:document.querySelector("#url-input").value,output:document.querySelector("#url-output").value,focus:document.activeElement.id,mode:document.querySelector("#url-mode").value})');assert(d.value===''&&d.output===''&&d.focus==='url-input'&&d.mode==='component','clear');return d;
});
await check('B02 actual Tab navigation to mode and encoding button',async()=>{
 await fill('a b');await key('Tab','Tab',9);const modeFocus=await run('document.activeElement.id');assert(modeFocus==='url-mode','mode focus');await key('Tab','Tab',9);const button=await run('document.activeElement.textContent');assert(button==='编码','button focus');await key('Enter','Enter',13,'\r');assert(await output()==='a%20b','keyboard encode');return {modeFocus,button,output:await output()};
});
await check('B03 actual browser clipboard roundtrip, not external app',async()=>{
 await send('Browser.grantPermissions',{origin:'http://127.0.0.1:4175',permissions:['clipboardReadWrite','clipboardSanitizedWrite']});await click(copy);const d=await run('(async()=>({copied:await navigator.clipboard.readText(),output:document.querySelector("#url-output").value,status:document.querySelector("#url-status").textContent}))()');assert(d.copied===d.output&&d.status.includes('结果已复制'),'clipboard');return d;
});
await check('B03 missing/rejected API runtime injection real selection',async()=>{
 const rows=[];for(const denied of [false,true]){await run(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:${denied?'{writeText:()=>Promise.reject(new Error("denied"))}':'undefined'}})`);await click(copy);const d=await run('({focus:document.activeElement.id,start:document.querySelector("#url-output").selectionStart,end:document.querySelector("#url-output").selectionEnd,length:document.querySelector("#url-output").value.length,status:document.querySelector("#url-status").textContent})');assert(d.focus==='url-output'&&d.start===0&&d.end===d.length&&d.status.includes('手动复制'),'fallback');rows.push({denied,...d});await run('delete navigator.clipboard')}return rows;
});
await check('B03 pending copy mode change cannot write stale success',async()=>{
 await run('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:()=>new Promise(r=>window.__finishCopy=r)}})');await click(copy);await mode('uri');await fill('new value');await click(action(1));await run('window.__finishCopy();delete navigator.clipboard');await tick();assert(await output()==='new%20value'&&!(await status()).includes('已复制'),'stale feedback');return {output:await output(),status:await status()};
});
await check('B04 navigation structure and previous tools regression',async()=>{
 for(const id of ['office-tools','developer-tools','privacy']){await click(`nav a[href="#${id}"]`);assert(await run('location.hash')==='#'+id,'nav')}
 await click('.tool-card a[href="#url-encoder"]');assert(await run('location.hash')==='#url-encoder','anchor');await click('#text-statistics > .tool-toggle');await run('document.querySelector("#statistics-input").focus()');await send('Input.insertText',{text:'你好 world\n😀'});await tick();const counts=await values();assert(JSON.stringify(counts)===JSON.stringify(['10','8','3','2','2']),'text regression');await click('#text-statistics > .tool-toggle');
 await click('#json-formatter > .tool-toggle');await run('document.querySelector("#json-input").focus()');await send('Input.insertText',{text:'{"a":1}'});await click('#json-formatter .actions button:nth-of-type(2)');const json=await run('document.querySelector("#json-output").value');assert(json==='{\n  "a": 1\n}','json regression');await click('#json-formatter > .tool-toggle');
 const d=await run('({main:document.querySelectorAll("main").length,h1:document.querySelectorAll("h1").length})');assert(d.main===1&&d.h1===1,'structure');return {...d,counts,json};
});
await check('B04 collapse/reopen and reload reset',async()=>{
 await click(toggle);await click(toggle);assert(await run('document.querySelector("#url-input").value')===''&&await output()==='','reopen');await mode('uri');await fill('saved?');await click(action(1));await send('Page.reload');for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,50));if(await run('!!document.querySelector("#url-encoder > .tool-toggle")'))break}await tick();await click(toggle);const d=await run('({input:document.querySelector("#url-input").value,output:document.querySelector("#url-output").value,mode:document.querySelector("#url-mode").value})');assert(d.input===''&&d.output===''&&d.mode==='component','reload');return d;
});
for(const [width,height] of [[375,812],[768,1024],[1440,900]])await check('B05 desktop responsive viewport '+width,async()=>{
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await fill('你好😀'.repeat(100));await click(action(1));await run('document.querySelector("#url-input").scrollIntoView({block:"start"})');await tick();const d=await run('({width:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');await shot('url-'+width+'-light');assert(d.scroll<=d.client,'overflow');return d;
});
await check('B05 dark response and accessibility semantics',async()=>{
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await tick();await shot('url-1440-dark');await send('Accessibility.enable');const ax=await send('Accessibility.getFullAXTree');await fs.writeFile(`${dir}/accessibility.json`,JSON.stringify(ax,null,2));const d=await run('({dark:matchMedia("(prefers-color-scheme: dark)").matches,readonly:document.querySelector("#url-output").readOnly,live:document.querySelector("#url-status").getAttribute("aria-live")})');assert(d.dark&&d.readonly&&d.live==='polite','semantics');return d;
});
await check('B06 HTML and URL-looking text never execute or navigate',async()=>{
 const marker='WORKDEV_URL_SYNTHETIC_ONLY';const start=events.length;const before=await run('location.href');
 for(const text of ['<script>window.__urlExecuted=true</script>','<img src="https://example.invalid/'+marker+'" onerror="window.__urlExecuted=true">','javascript:alert(1)','data:text/html,<script>alert(1)</script>']){await fill(encodeURIComponent(text));await click(action(2));assert(await output()===text,'text');assert(await run('!!document.querySelector("#url-encoder script,#url-encoder img")')===false,'HTML rendered')}
 await fill(encodeURIComponent(marker));await click(action(2));await fill('%GG'+marker);await click(action(2));const d=await run('(async()=>({url:location.href,executed:!!window.__urlExecuted,local:{...localStorage},session:{...sessionStorage},cookie:document.cookie,dbs:await indexedDB.databases()}))()');const observed=events.slice(start);assert(d.url===before&&!d.executed&&!JSON.stringify(d).includes(marker)&&!JSON.stringify(observed).includes(marker),'leak/navigation');return {storage:d,events:observed};
});
const record={date:new Date().toISOString(),browser:version,system:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model},url:'http://127.0.0.1:4175/',mode:'real installed headless Chrome/CDP; desktop viewports mobile=false DPR1; not physical phone/system IME/screenreader/external editor; no performance measurement',results,exceptions:events.filter(e=>e.method==='Runtime.exceptionThrown')};
await fs.writeFile(`${dir}/browser-results.json`,JSON.stringify(record,null,2));await fs.writeFile(`${dir}/browser-events.json`,JSON.stringify(events,null,2));console.log(JSON.stringify({browser:version,system:record.system,passed:results.filter(x=>x.status==='pass').length,failures:results.filter(x=>x.status==='fail'),exceptions:record.exceptions.length},null,2));ws.close();
