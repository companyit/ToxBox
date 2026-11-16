import fs from 'node:fs'
import { createRequire } from 'node:module'
import { performance } from 'node:perf_hooks'
const require=createRequire(process.cwd()+'/package.json'),ts=require('typescript')
const url=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64')
const textUrl=url(fs.readFileSync('src/utils/textDiff.ts','utf8'))
const {compareFiles}=await import(url(fs.readFileSync('src/utils/fileDiff.ts','utf8').replace("'./textDiff'",JSON.stringify(textUrl))))
const left=Array.from({length:5000},(_,i)=>'p'.repeat(94)+String(i).padStart(5,'0')).join('\n')+'p'
const right=Array.from({length:5000},(_,i)=>'p'.repeat(94)+String(i+5000).padStart(5,'0')).join('\n')+'q'
const one=left.slice(0,250000)+'X'+left.slice(250001)
const cases={identical:[left,left],oneChange:[left,one],allDifferent:[left,right],repeated:[Array(5000).fill('x').join('\n'),Array(5000).fill('y').join('\n')],skewed:[left,'one line'],empty:[left,'']}
const samples=[]
for(const [name,[a,b]] of Object.entries(cases)){
 compareFiles(a,b)
 const ms=[];let result
 for(let i=0;i<3;i++){const start=performance.now();result=compareFiles(a,b);ms.push(Number((performance.now()-start).toFixed(3)))}
 samples.push({name,codeUnits:[a.length,b.length],ms,rows:result.rows.length,added:result.added,removed:result.removed,unchanged:result.unchanged})
}
console.log(JSON.stringify({kind:'Node algorithm timing; desktop browser/total memory not implied',node:process.version,samples,typedArrayAllocationAt5000:{decisionBytes:Math.ceil(5000*5000/8),rollingRowBytes:2*5001*2,lineIdBytes:2*5000*4,previousLengthMatrixBytes:5001*5001*2}},null,2))
