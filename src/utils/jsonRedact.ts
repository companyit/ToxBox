import { writePrettyJson, JsonReader,  JsonFailure, validJsonUnicode, type JsonValue, type JsonReadCode } from './jsonReader'
export type RedactField = 'source' | 'paths' | 'replacement'
export type RedactCode = JsonReadCode | 'input' | 'missing' | 'config-limit' | 'paths' | 'path' | 'duplicate-path' | 'overlap' | 'replacement' | 'output' | 'failed'
export const redactErrors: Record<RedactCode,string> = {
 input:'源 JSON 最多 100,000 个码元，请缩短后重试。',missing:'请填写完整源 JSON。',
 'config-limit':'路径配置最多 10,000 个码元，请减少后重试。',paths:'路径配置必须是含 1～100 个 JSON 字符串的数组。',
 path:'路径无效或不存在；请使用 JSON Pointer，数组下标不能含前导零，每条路径最多 1,000 个码元。',
 'duplicate-path':'目标路径重复，请移除重复配置。',overlap:'目标路径存在祖先与后代重叠，请只保留需要替换的层级。',
 replacement:'替换文本最多 200 个码元，不能包含空字符或孤立代理项。',
 'invalid-json':'仅接受严格 JSON，不支持 BOM、注释或末尾逗号。',depth:'JSON 容器最多 30 层，请减少嵌套。',nodes:'JSON 最多 50,000 个节点（含键）。',
 unicode:'内容包含空字符或孤立代理项，请移除后重试。','duplicate-key':'对象存在重复字段名，请明确保留的字段。',
 output:'结果超过 1,000,000 个码元，没有返回部分结果。',failed:'本地脱敏失败，请减少内容后重试。',
}
export class RedactFailure extends Error {
 constructor(readonly code:RedactCode,readonly field:RedactField='source',readonly item?:number,readonly line?:number,readonly column?:number){super(code)}
}
export function validateRedactInputs(source:string,paths:string,replacement:string){
 if(source.length>100000)throw new RedactFailure('input')
 if(/^[\x20\t\r\n]*$/.test(source))throw new RedactFailure('missing')
 if(paths.length>10000)throw new RedactFailure('config-limit','paths')
 if(replacement.length>200||!validJsonUnicode(replacement))throw new RedactFailure('replacement','replacement')
}
function read(text:string,field:RedactField):JsonValue{
 try{if(!validJsonUnicode(text))throw new JsonFailure('unicode');return new JsonReader(text).read()}
 catch(failure){if(!(failure instanceof JsonFailure))throw failure;const lines=failure.offset===undefined?undefined:text.slice(0,failure.offset).split(/\r\n|\r|\n/);throw new RedactFailure(failure.code,field,undefined,lines?.length,lines?lines.at(-1)!.length+1:undefined)}
}
function pretty(value:JsonValue):string{
 const parts:string[]=[];let size=0
 const emit=(text:string)=>{size+=text.length;if(size>1000000)throw new RedactFailure('output');parts.push(text)}
 writePrettyJson(value,emit);return parts.join('')
}
type Location={parent:Map<string,JsonValue>;key:string}|{parent:JsonValue[];key:number}|null
export function redactJson(source:string,config:string,replacement:string):{output:string;count:number}{
 validateRedactInputs(source,config,replacement)
 let root=read(source,'source');const settings=read(config,'paths')
 if(!Array.isArray(settings)||settings.length<1||settings.length>100||settings.some(p=>typeof p!=='string'))throw new RedactFailure('paths','paths')
 const targets=(settings as string[]).map((pointer,index)=>{
  if(pointer.length>1000||(pointer!==''&&!pointer.startsWith('/'))||/~(?:[^01]|$)/.test(pointer))throw new RedactFailure('path','paths',index+1)
  return pointer===''?[]:pointer.slice(1).split('/').map(part=>part.replace(/~1/g,'/').replace(/~0/g,'~'))
 })
 for(let i=0;i<targets.length;i++)for(let j=0;j<i;j++){
  const a=targets[i]!,b=targets[j]!,length=Math.min(a.length,b.length)
  if(a.slice(0,length).every((part,k)=>part===b[k]))throw new RedactFailure(a.length===b.length?'duplicate-path':'overlap','paths',i+1)
 }
 const locations:Location[]=targets.map((parts,index)=>{
  if(!parts.length)return null
  let node=root,location:Location=null
  for(const key of parts){
   if(node instanceof Map&&node.has(key)){location={parent:node,key};node=node.get(key)!}
   else if(Array.isArray(node)&&/^(0|[1-9]\d*)$/.test(key)&&Number.isSafeInteger(Number(key))&&Number(key)<node.length){location={parent:node,key:Number(key)};node=node[Number(key)]!}
   else throw new RedactFailure('path','paths',index+1)
  }
  return location
 })
 for(const location of locations){if(!location)root=replacement;else if(location.parent instanceof Map)location.parent.set(location.key as string,replacement);else location.parent[location.key as number]=replacement}
 return {output:pretty(root),count:locations.length}
}
