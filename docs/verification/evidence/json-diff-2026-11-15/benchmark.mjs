import fs from 'node:fs'
import {createRequire} from 'node:module'
import {performance} from 'node:perf_hooks'
const require=createRequire(process.cwd()+'/package.json'),ts=require('typescript')
const url=source=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64')
const reader=url(fs.readFileSync('src/utils/jsonReader.ts','utf8'))
const {compareJson}=await import(url(fs.readFileSync('src/utils/jsonDiff.ts','utf8').replace("'./jsonReader'",JSON.stringify(reader))))
const cases={maxStrings:['"'+'x'.repeat(99998)+'"','"'+'x'.repeat(99998)+'"'],maxDifferences:[JSON.stringify(Array(2000).fill(0)),JSON.stringify(Array(2000).fill(1))],largeExponent:['1e'+'9'.repeat(99998),'1e'+'9'.repeat(99998)],deep:['['.repeat(30)+'0'+']'.repeat(30),'['.repeat(30)+'1'+']'.repeat(30)]}
const samples=[]
for(const [name,[a,b]] of Object.entries(cases)){
 compareJson(a,b);const ms=[];let result
 for(let i=0;i<3;i++){const start=performance.now();result=compareJson(a,b);ms.push(Number((performance.now()-start).toFixed(3)))}
 samples.push({name,codeUnits:[a.length,b.length],ms,changes:result.changes.length})
}
console.log(JSON.stringify({kind:'Node algorithm timings, not browser/device or total memory evidence',node:process.version,samples},null,2))
