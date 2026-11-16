import { performance } from 'node:perf_hooks'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require=createRequire(process.cwd()+'/package.json'), ts=require('typescript')
const toUrl=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64')
const diffUrl=toUrl(fs.readFileSync('src/utils/textDiff.ts','utf8'))
const { compareText }=await import(diffUrl)
const { decodeFileText }=await import(toUrl(fs.readFileSync('src/utils/fileText.ts','utf8').replace("'./textDiff'",JSON.stringify(diffUrl))))
const common=Array.from({length:1000},(_,i)=>'line-'+i)
const cases={identical:[common,common],oneChange:[common,common.map((x,i)=>i===500?'changed':x)],allDifferent:[common,common.map((_,i)=>'other-'+i)],repeated:[Array(1000).fill('x'),Array(1000).fill('y')],longLines:[Array.from({length:1000},(_,i)=>'a'.repeat(92)+String(i).padStart(6,'0')),Array.from({length:1000},(_,i)=>'a'.repeat(92)+String(1000+i).padStart(6,'0'))]}
const output={node:process.version,kind:'Node pure algorithm timing; not browser/UI evidence',samples:[]}
for(const [name,pair] of Object.entries(cases)){
 const [left,right]=pair.map(lines=>lines.join('\n'));compareText(left,right)
 const ms=[];let result
 for(let i=0;i<5;i++){const start=performance.now();result=compareText(left,right);ms.push(Number((performance.now()-start).toFixed(3)))}
 output.samples.push({name,chars:[left.length,right.length],lines:1000,milliseconds:ms,rows:result.rows.length,added:result.added,removed:result.removed,unchanged:result.unchanged})
}
for(const [name,value] of [['smallFileTooManyChars','x'.repeat(100001)],['smallFileTooManyLines','x\n'.repeat(1000)]]){
 const bytes=new TextEncoder().encode(value)
 try{decodeFileText(bytes);output[name]={bytes:bytes.length,result:'accepted'}}catch(e){output[name]={bytes:bytes.length,rejection:e.code}}
}
output.matrixBytes=[1000,5000,10000].map(n=>({linesEach:n,bytes:(n+1)*(n+1)*2}))
console.log(JSON.stringify(output,null,2))
