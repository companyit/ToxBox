import fs from 'node:fs/promises';
import os from 'node:os';
const dir=new URL('.',import.meta.url).pathname;
await fs.mkdir(dir,{recursive:true});
const tabs=await (await fetch('http://127.0.0.1:9224/json')).json();
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
async function fill(text){await run('document.querySelector("#json-input").focus();document.querySelector("#json-input").select()');await send('Input.insertText',{text});await tick()}
async function values(){return run('[...document.querySelectorAll("#text-statistics dd")].map(x=>x.textContent.trim())')}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(`${dir}/${name}.png`,Buffer.from(r.data,'base64'))}
await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Network.enable');
const version=await send('Browser.getVersion');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:4174/'});
for(let i=0;i<60;i++){if(await run('!!document.querySelector(".tool-toggle")'))break;await new Promise(r=>setTimeout(r,100))}
await tick();
const toggle='#json-formatter > .tool-toggle';
const action=n=>`#json-formatter .actions button:nth-of-type(${n})`;
const output=()=>run('document.querySelector("#json-output").value');
const status=()=>run('document.querySelector("#json-status").textContent');
await click(toggle);
await check('B01 context.source feature probe (not required)',async()=>run('(()=>{let source;JSON.parse("9007199254740993",(_k,v,c)=>{source=c?.source;return v});return {source,supported:source==="9007199254740993"}})()'));
await check('B01 six top-level values and exact native output',async()=>{
 const rows=[];for(const s of ['{"a":1}','[1,true,null]','"你好"','42','true','false','null','0']){await fill(s);await click(action(3));const actual=await output();assert(actual===JSON.stringify(JSON.parse(s)),s);rows.push({input:s,output:actual})}return rows;
});
await check('B01 syntax vs numeric safety, representation and duplicate keys',async()=>{
 const rows=[];for(const [s,expected] of [['9007199254740993','安全整数'],['1e400','有限数']]){await fill(s);await click(action(1));assert((await status()).includes('语法合法'),'validate');assert(await output()==='','validation output');await click(action(2));const message=await status();assert(message.includes(expected)&&await output()==='','unsafe output');rows.push({input:s,message})}
 for(const [s,expected] of [['1.0000000000000001','1'],['1e-400','0'],['-0','0'],['1e2','100'],['{"a":1,"a":2}','{"a":2}'],['"\\u4F60"','"你"']]){await fill(s);await click(action(3));assert(await output()===expected,s);rows.push({input:s,output:await output()})}
 assert((await run('document.querySelector("#json-rules").textContent')).includes('不是无损'),'warning');return rows;
});
await check('B01 exact 2/4 indent, edit invalidation and errors',async()=>{
 await fill('{"a":1}');await click(action(2));assert(await output()==='{\n  "a": 1\n}','2 spaces');
 await run('document.querySelector("#json-indent").value="4";document.querySelector("#json-indent").dispatchEvent(new Event("change",{bubbles:true}))');await tick();assert(await output()==='','indent invalidation');await click(action(2));assert(await output()==='{\n    "a": 1\n}','4 spaces');
 await fill('{');assert(await output()==='','edit invalidation');await click(action(2));assert((await status()).includes('语法错误'),'error');
 await fill(' \t\n');await click(action(1));assert((await status()).includes('请输入'),'empty');return {twoAndFour:true,editClears:true,invalidClears:true};
});
await check('B01 input/depth/output resource limits and recovery',async()=>{
 const rows=[];for(const s of ['"'+'a'.repeat(99998)+'"','"'+'a'.repeat(99999)+'"','['.repeat(100)+'0'+']'.repeat(100),'['.repeat(101)+'0'+']'.repeat(101)]){await fill(s);await click(action(3));const d=await run('({length:document.querySelector("#json-input").value.length,outputLength:document.querySelector("#json-output").value.length,status:document.querySelector("#json-status").textContent})');assert(d.length===s.length,'truncation');if(s.length>100000||s.startsWith('['.repeat(101)))assert(d.outputLength===0,'invalid output');else assert(d.outputLength>0,'valid output');rows.push(d)}
 const expanded='['.repeat(99)+'['+Array(10000).fill('0').join(',')+']'+']'.repeat(99);await fill(expanded);await click(action(2));assert(await output()===''&&(await status()).includes('输出超过'),'output limit');await fill('{}');await click(action(3));assert(await output()==='{}','recovery');return {rows,outputLimit:true,recovery:true};
});
await check('B02 sample guard, keyboard Enter clear and focus',async()=>{
 await click(action(5));await click(action(4));assert((await run('document.querySelector("#json-input").value')).includes('WorkDev Tools'),'sample');assert(await output()==='','sample auto execute');await fill(' ');assert(await run(`document.querySelector('${action(4)}').disabled`),'sample guard');
 await run(`document.querySelector('${action(5)}').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await tick();
 const d=await run('({input:document.querySelector("#json-input").value,output:document.querySelector("#json-output").value,focus:document.activeElement.id,indent:document.querySelector("#json-indent").value})');assert(d.input===''&&d.output===''&&d.focus==='json-input'&&d.indent==='2','clear');return d;
});
await check('B02 shared structure, navigation and text statistics regression',async()=>{
 for(const hash of ['office-tools','developer-tools','privacy']){await click(`nav a[href="#${hash}"]`);assert(await run('location.hash')==='#'+hash,'nav')}
 await click('.tool-card a[href="#json-formatter"]');assert(await run('location.hash')==='#json-formatter','json card');
 await click('#text-statistics > .tool-toggle');await run('document.querySelector("#statistics-input").focus()');await send('Input.insertText',{text:'你好 world\n😀'});await tick();const counts=await run('[...document.querySelectorAll("#text-statistics dd")].map(x=>x.textContent.trim())');assert(JSON.stringify(counts)===JSON.stringify(['10','8','3','2','2']),'text counts '+counts);await click('#text-statistics > .tool-toggle');
 const d=await run('({main:document.querySelectorAll("main").length,h1:document.querySelectorAll("h1").length})');assert(d.main===1&&d.h1===1,'structure');return {...d,textCounts:counts};
});
await check('B03 actual Clipboard API roundtrip in browser, not external app',async()=>{
 await send('Browser.grantPermissions',{origin:'http://127.0.0.1:4174',permissions:['clipboardReadWrite','clipboardSanitizedWrite']});await fill('{"s":" a  b "}');await click(action(3));await click('#json-formatter .actions:last-child button');const d=await run('(async()=>({copied:await navigator.clipboard.readText(),output:document.querySelector("#json-output").value,status:document.querySelector("#json-status").textContent}))()');assert(d.copied===d.output&&d.status.includes('结果已复制'),'clipboard');return d;
});
await check('B03 unavailable and rejected Clipboard runtime fault injection',async()=>{
 const rows=[];for(const denied of [false,true]){await run(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:${denied?'{writeText:()=>Promise.reject(new Error("denied"))}':'undefined'}})`);await click('#json-formatter .actions:last-child button');const d=await run('({focus:document.activeElement.id,start:document.querySelector("#json-output").selectionStart,end:document.querySelector("#json-output").selectionEnd,length:document.querySelector("#json-output").value.length,status:document.querySelector("#json-status").textContent})');assert(d.focus==='json-output'&&d.start===0&&d.end===d.length&&d.status.includes('手动复制'),'fallback');rows.push({denied,...d});await run('delete navigator.clipboard')}return rows;
});
await check('B03 delayed copy stale feedback, runtime Promise injection',async()=>{
 await run('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:()=>new Promise(r=>window.__finishCopy=r)}})');await click('#json-formatter .actions:last-child button');await fill('false');await click(action(3));await run('window.__finishCopy();delete navigator.clipboard');await tick();assert(await output()==='false'&&!(await status()).includes('已复制'),'stale feedback');return {output:await output(),status:await status()};
});
for(const [width,height] of [[375,812],[768,1024],[1440,900]])await check('B04 desktop viewport '+width,async()=>{
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await fill('{"text":"'+'长文本'.repeat(100)+'"}');await click(action(2));await run('document.querySelector("#json-input").scrollIntoView({block:"start"})');await tick();const d=await run('({width:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})');await shot('json-'+width+'-light');assert(d.scroll<=d.client,'overflow');return d;
});
await check('B04 dark media response and AX semantics (not actual reader)',async()=>{
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await tick();await shot('json-1440-dark');await send('Accessibility.enable');const ax=await send('Accessibility.getFullAXTree');await fs.writeFile(`${dir}/accessibility.json`,JSON.stringify(ax,null,2));const d=await run('({dark:matchMedia("(prefers-color-scheme: dark)").matches,readonly:document.querySelector("#json-output").readOnly,live:document.querySelector("#json-status").getAttribute("aria-live")})');assert(d.dark&&d.readonly&&d.live==='polite','semantics');return d;
});
await check('B05 input/output/error observation privacy',async()=>{
 const marker='WORKDEV_JSON_VERIFY_SYNTHETIC_ONLY';const start=events.length;await fill(JSON.stringify({marker}));await click(action(2));await fill('{'+marker);await click(action(2));const d=await run('(async()=>({url:location.href,local:{...localStorage},session:{...sessionStorage},cookie:document.cookie,dbs:await indexedDB.databases()}))()');const observed=events.slice(start);assert(!JSON.stringify(d).includes(marker)&&!JSON.stringify(observed).includes(marker),'marker leak');return {storage:d,events:observed};
});
await check('B05 collapse reopen and real reload reset',async()=>{
 await click(toggle);await click(toggle);assert(await run('document.querySelector("#json-input").value')===''&&await output()==='','reopen');await fill('true');await click(action(3));await send('Page.reload');for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,50));if(await run('!!document.querySelector("#json-formatter > .tool-toggle")'))break}await tick();await click(toggle);const d=await run('({input:document.querySelector("#json-input").value,output:document.querySelector("#json-output").value,indent:document.querySelector("#json-indent").value})');assert(d.input===''&&d.output===''&&d.indent==='2','reload');return d;
});
const record={date:new Date().toISOString(),browser:version,system:{platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model},url:'http://127.0.0.1:4174/',mode:'real installed headless Chrome/CDP; desktop viewports mobile=false DPR1; not IME, phone, screenreader or external application',results,exceptions:events.filter(e=>e.method==='Runtime.exceptionThrown')};
await fs.writeFile(`${dir}/browser-results.json`,JSON.stringify(record,null,2));await fs.writeFile(`${dir}/browser-events.json`,JSON.stringify(events,null,2));console.log(JSON.stringify({browser:version,system:record.system,passed:results.filter(x=>x.status==='pass').length,failures:results.filter(x=>x.status==='fail'),exceptions:record.exceptions.length},null,2));ws.close();
