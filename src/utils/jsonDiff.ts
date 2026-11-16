import { JsonReader, JsonNumber, JsonFailure, validJsonUnicode, encodeJsonValue, type JsonReadCode, type JsonValue } from './jsonReader'
export type JsonDiffKind = 'add' | 'remove' | 'change'
export type JsonDiffFilter = 'all' | JsonDiffKind
export interface JsonChange { kind: JsonDiffKind; path: string; before?: string; after?: string }
export interface JsonDiffResult { changes: JsonChange[]; added: number; removed: number; modified: number }
export type JsonDiffCode = JsonReadCode | 'input' | 'missing' | 'changes' | 'output' | 'report' | 'failed'
export const JSON_DIFF_INPUT = 100000, JSON_DIFF_CHANGES = 2000, JSON_DIFF_OUTPUT = 1000000, JSON_DIFF_PAGE = 100
export const jsonDiffErrors: Record<JsonDiffCode,string> = {
 input:'每侧最多 100,000 个 UTF-16 码元，请缩短后重试。', missing:'请填写两侧完整 JSON，空白不代表 null。',
 'invalid-json':'JSON 语法无效，仅接受严格 JSON，不支持 BOM、注释或末尾逗号。',
 depth:'JSON 容器嵌套最多 30 层，请减少嵌套后重试。', nodes:'每侧 JSON 最多 50,000 个节点（含键）。',
 unicode:'内容包含空字符或孤立代理项，请移除后重试。', 'duplicate-key':'同一个对象存在重复字段名，请明确保留哪个值后重试。',
 changes:'差异超过 2,000 项，请缩小对比范围；没有返回部分结果。', output:'差异路径和值的内容超过 1,000,000 个码元，请缩小对比范围。',
 report:'完整报告超过 1,000,000 个码元，仍可分页查看差异。', failed:'结构对比失败，请减少内容后重试。',
}
export class JsonDiffFailure extends Error {
 constructor(readonly code: JsonDiffCode, readonly side?: 'before'|'after', readonly line?: number, readonly column?: number){super(code)}
}
export function validateJsonDiffInput(input:string,side:'before'|'after') {
 if(input.length>JSON_DIFF_INPUT)throw new JsonDiffFailure('input',side)
 if(/^[\x20\t\r\n]*$/.test(input))throw new JsonDiffFailure('missing',side)
}
function read(input:string,side:'before'|'after'): JsonValue {
 validateJsonDiffInput(input,side)
 try {
  if(!validJsonUnicode(input))throw new JsonFailure('unicode')
  return new JsonReader(input).read()
 } catch(failure) {
  if(!(failure instanceof JsonFailure))throw failure
  const lines=failure.offset===undefined?undefined:input.slice(0,failure.offset).split(/\r\n|\r|\n/)
  throw new JsonDiffFailure(failure.code,side,lines?.length,lines ? lines.at(-1)!.length+1 : undefined)
 }
}
/** Compare decimal values without rounding, exponentiation or materializing huge integers. */
export function canonicalJsonNumber(source:string):string {
 const negative=source.startsWith('-')
 const [mantissa='',exponent='0']=source.replace(/^-/,'').toLowerCase().split('e')
 const fraction=mantissa.includes('.') ? mantissa.length-mantissa.indexOf('.')-1 : 0
 const digits=mantissa.replace('.','').replace(/^0+/,'')
 if(!digits)return '0'
 const zeros=digits.match(/0+$/)?.[0].length??0
 return (negative?'-':'')+digits.slice(0,digits.length-zeros)+'e'+(BigInt(exponent)+BigInt(zeros-fraction)).toString()
}
const pointer=(path:string,key:string)=>path+'/'+key.replace(/~/g,'~0').replace(/\//g,'~1')
export function compareJson(before:string,after:string):JsonDiffResult {
 const left=read(before,'before'),right=read(after,'after')
 const changes:JsonChange[]=[];let size=0,added=0,removed=0,modified=0
 const emit=(kind:JsonDiffKind,path:string,a?:JsonValue,b?:JsonValue)=>{
  if(changes.length>=JSON_DIFF_CHANGES)throw new JsonDiffFailure('changes')
  const old=a===undefined?undefined:encodeJsonValue(a),next=b===undefined?undefined:encodeJsonValue(b)
  size+=path.length+(old?.length??0)+(next?.length??0)+64
  if(size>JSON_DIFF_OUTPUT)throw new JsonDiffFailure('output')
  changes.push({kind,path,...(old!==undefined?{before:old}:{}),...(next!==undefined?{after:next}:{})})
  if(kind==='add')added++;else if(kind==='remove')removed++;else modified++
 }
 const visit=(a:JsonValue,b:JsonValue,path:string)=>{
  if(a instanceof Map && b instanceof Map){
   for(const [key,value] of a){const p=pointer(path,key);if(b.has(key))visit(value,b.get(key)!,p);else emit('remove',p,value)}
   for(const [key,value] of b)if(!a.has(key))emit('add',pointer(path,key),undefined,value)
  }else if(Array.isArray(a)&&Array.isArray(b)){
   for(let i=0;i<Math.max(a.length,b.length);i++){
    const p=pointer(path,String(i))
    if(i>=a.length)emit('add',p,undefined,b[i]);else if(i>=b.length)emit('remove',p,a[i]);else visit(a[i]!,b[i]!,p)
   }
  }else if(a instanceof JsonNumber && b instanceof JsonNumber){if(canonicalJsonNumber(a.source)!==canonicalJsonNumber(b.source))emit('change',path,a,b)}
  else if(a!==b)emit('change',path,a,b)
 }
 visit(left,right,'')
 return {changes,added,removed,modified}
}
export const jsonChangeLabels:Record<JsonDiffKind,string>={add:'新增',remove:'删除',change:'修改'}
export function jsonDiffReport(result:JsonDiffResult,filter:JsonDiffFilter,limit=JSON_DIFF_OUTPUT):string {
 const parts=[`JSON 结构对比报告（${filter==='all'?'全部':jsonChangeLabels[filter]}；不是 JSON Patch）\n新增 ${result.added} 项，删除 ${result.removed} 项，修改 ${result.modified} 项。`]
 let size=parts[0]!.length
 if(size>limit)throw new JsonDiffFailure('report')
 for(const item of result.changes){
  if(filter!=='all'&&item.kind!==filter)continue
  const line=`\n${jsonChangeLabels[item.kind]}\t路径 ${JSON.stringify(item.path)}${item.path===''?'（根节点）':''}\t原值 ${item.before??'（不存在）'}\t新值 ${item.after??'（不存在）'}`
  size+=line.length
  if(size>limit)throw new JsonDiffFailure('report')
  parts.push(line)
 }
 return parts.join('')
}
