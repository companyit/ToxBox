import { parseDocument, stringify, isAlias, isMap, isSeq, isScalar, LineCounter } from 'yaml'
import type { Node } from 'yaml'
export type JsonYamlDirection = 'json-to-yaml' | 'yaml-to-json'
export const jsonYamlErrors = {
  syntax: '语法无效，请检查引号、缩进、分隔符或文档数量。JSON 不接受注释、尾随逗号或 BOM。',
  duplicate: '存在重复键，请为每个字段使用唯一名称。',
  unsupported: '仅支持 YAML 1.2 单文档与 JSON 兼容数据，不支持锚点、别名、合并键、类型标签或复杂/非字符串键。',
  number: '数值必须有限，整数须在 ±9,007,199,254,740,991 范围内；较大整数请用引号写成字符串。',
  input: '输入超过 100,000 个 UTF-16 码元，请缩短后重试。',
  output: '结果超过 1,000,000 个 UTF-16 码元，请减少内容后重试。',
  depth: '容器嵌套最多 30 层，请减少嵌套后重试。',
  nodes: '数据最多 20,000 个节点（含映射键），请减少内容后重试。',
  unicode: '字符串包含孤立代理项，请检查 Unicode 内容。',
  failed: '转换失败，请检查输入或减少内容后重试。',
} as const
export type JsonYamlCode = keyof typeof jsonYamlErrors
export type JsonYamlResult = {status:'empty'} | {status:'success';output:string} | {status:'error';code:JsonYamlCode;line?:number;col?:number}
class ConversionError extends Error { constructor(public readonly code:JsonYamlCode,public readonly offset?:number){super(code)} }
function unicodeValid(value:string) {
 for(let i=0;i<value.length;i++){
  const code=value.charCodeAt(i)
  if(code>=0xd800&&code<=0xdbff){const next=value.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false}
  else if(code>=0xdc00&&code<=0xdfff)return false
 }
 return true
}
export function convertJsonYaml(input:string,direction:JsonYamlDirection):JsonYamlResult {
 const lines=new LineCounter()
 try {
  if(input.length>100000)throw new ConversionError('input')
  if(!input.trim())return {status:'empty'}
  if(direction!=='json-to-yaml'&&direction!=='yaml-to-json')throw new ConversionError('unsupported')
  // Native parsing enforces JSON grammar; AST parsing below separately rejects duplicates and unsafe numbers.
  if(direction==='json-to-yaml'){
   try {JSON.parse(input)}catch{throw new ConversionError('syntax')}
  }
  const doc=parseDocument(input,{version:'1.2',schema:'core',intAsBigInt:true,uniqueKeys:true,merge:false,resolveKnownTags:false,prettyErrors:false,logLevel:'error',strict:true,lineCounter:lines})
  const error=doc.errors[0]
  if(error)throw new ConversionError(error.code==='DUPLICATE_KEY'?'duplicate':error.code==='MULTIPLE_DOCS'?'unsupported':error.code==='RESOURCE_EXHAUSTION'?'depth':'syntax',error.pos[0])
  if(doc.warnings.length||doc.directives.yaml.version!=='1.2'||Object.entries(doc.directives.tags).some(([key,value])=>!((key==='!'&&value==='!')||(key==='!!'&&value==='tag:yaml.org,2002:'))))throw new ConversionError('unsupported')
  let count=0
  const reject=(node:Node|null|undefined,code:JsonYamlCode):never=>{throw new ConversionError(code,node?.range?.[0])}
  const read=(node:Node|null|undefined,depth:number):unknown=>{
   if(++count>20000)return reject(node,'nodes')
   if(!node)return null
   if(isAlias(node)||node.tag||('anchor' in node&&node.anchor))return reject(node,'unsupported')
   if(isMap(node)||isSeq(node)){
    if(depth>=30)return reject(node,'depth')
    if(isSeq(node))return node.items.map(item=>read(item as Node|null,depth+1))
    const object:Record<string,unknown>=Object.create(null)
    for(const pair of node.items){
     const key=pair.key as Node|null
     if(!isScalar(key)||typeof key.value!=='string'||key.value==='<<')return reject(key,'unsupported')
     const name=read(key,depth+1) as string
     if(Object.hasOwn(object,name))return reject(key,'duplicate')
     object[name]=read(pair.value as Node|null,depth+1)
    }
    return object
   }
   if(!isScalar(node))return reject(node,'unsupported')
   const value=node.value
   if(typeof value==='string'){if(!unicodeValid(value))return reject(node,'unicode');return value}
   if(typeof value==='bigint'){
    if(value>BigInt(Number.MAX_SAFE_INTEGER)||value<BigInt(Number.MIN_SAFE_INTEGER))return reject(node,'number')
    return Number(value)
   }
   if(typeof value==='number'){
    if(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))return reject(node,'number')
    return value
   }
   if(value===null||typeof value==='boolean')return value
   return reject(node,'unsupported')
  }
  const value=read(doc.contents,0)
  const output=direction==='yaml-to-json'?JSON.stringify(value,null,2):stringify(value,{version:'1.2',schema:'core',indent:2,lineWidth:0,aliasDuplicateObjects:false,logLevel:'silent'})
  if(output.length>1000000)throw new ConversionError('output')
  return {status:'success',output}
 }catch(error){
  if(error instanceof ConversionError){
   const location=error.offset===undefined?{}:lines.linePos(error.offset)
   return {status:'error',code:error.code,...location}
  }
  return {status:'error',code:'failed'}
 }
}
