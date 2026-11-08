import { test, expect } from 'vitest'
import { parse } from 'yaml'
import { convertJsonYaml } from '../../src/utils/jsonYaml'
function success(input:string,direction:'json-to-yaml'|'yaml-to-json') {
 const result=convertJsonYaml(input,direction)
 if(result.status!=='success')throw new Error(JSON.stringify(result))
 return result.output
}
test('对象、数组、标量和多行中文双向保留JSON数据类型',()=>{
 for(const value of [{name:'中文',enabled:true,empty:'',nothing:null,items:['001','yes',false,1.25],note:'第一行\n第二行\n'},[],{},null,true,false,0,-0,1.5,'001','2026-11-07',''] ){
  const yaml=success(JSON.stringify(value),'json-to-yaml')
  expect(parse(yaml)).toEqual(value===0?0:value)
  expect(JSON.parse(success(yaml,'yaml-to-json'))).toEqual(value===0?0:value)
 }
 expect(JSON.parse(success('a: yes\nb: no\ndate: 2026-11-07\nnote: |\n  第一行\n  第二行\n','yaml-to-json'))).toEqual({a:'yes',b:'no',date:'2026-11-07',note:'第一行\n第二行\n'})
})
test('重复JSON/YAML键拒绝，键解码后仍检查重复',()=>{
 for(const [input,direction] of [['{"a":1,"a":2}','json-to-yaml'],['{"a":1,"\\u0061":2}','json-to-yaml'],['a: 1\na: 2','yaml-to-json']] as const){
  expect(convertJsonYaml(input,direction)).toMatchObject({status:'error',code:'duplicate'})
 }
})
test('非JSON语法不会被YAML宽松解析接受',()=>{
 for(const input of ['{a:1}','{"a":1,}','//注释\n{}','\ufeff{}','[1,]','undefined','NaN','']){
  expect(convertJsonYaml(input,'json-to-yaml')).toMatchObject({status:input===''?'empty':'error'})
 }
})
test('YAML受限结构、标签、非字符串键和文档版本拒绝',()=>{
 for(const input of ['a: &x 1\nb: *x','a: &x [*x]','a: !!str 1','a: !private value','<<: {a: 1}','1: value','true: value','? [a,b]\n: value','---\na: 1\n---\nb: 2','%YAML 1.1\n---\na: yes','%TAG !x! tag:example.com,2000:\n---\na: 1']){
  expect(convertJsonYaml(input,'yaml-to-json').status,input).toBe('error')
 }
})
test('安全整数、非有限值及浮点范围',()=>{
 for(const input of ['9007199254740992','-9007199254740992','1e100'])expect(convertJsonYaml(input,'json-to-yaml')).toMatchObject({status:'error',code:'number'})
 for(const input of ['.nan','.inf','-.inf','9007199254740992'])expect(convertJsonYaml(input,'yaml-to-json')).toMatchObject({status:'error',code:'number'})
 expect(success('9007199254740991','yaml-to-json')).toBe('9007199254740991')
 expect(JSON.parse(success('"9007199254740992"','yaml-to-json'))).toBe('9007199254740992')
})
test('限制不截断：输入、深度、节点和输出',()=>{
 expect(convertJsonYaml(' '.repeat(100001),'yaml-to-json')).toMatchObject({status:'error',code:'input'})
 expect(convertJsonYaml('['.repeat(31)+'0'+']'.repeat(31),'json-to-yaml')).toMatchObject({status:'error',code:'depth'})
 expect(convertJsonYaml('['+Array(20000).fill('0').join(',')+']','json-to-yaml')).toMatchObject({status:'error',code:'nodes'})
 expect(convertJsonYaml('['.repeat(30)+Array(19960).fill('0').join(',')+']'.repeat(30),'yaml-to-json')).toMatchObject({status:'error',code:'output'})
})
test('原型字段作为普通数据，行列提示不包含输入片段',()=>{
 const value=JSON.parse(success('__proto__: {private: true}\nconstructor: value','yaml-to-json'))
 expect(Object.hasOwn(value,'__proto__')).toBe(true);expect(({} as Record<string,unknown>).private).toBeUndefined()
 const error=convertJsonYaml('PRIVATE_SECRET: 1\nPRIVATE_SECRET: 2','yaml-to-json')
 expect(error).toMatchObject({status:'error',code:'duplicate',line:2,col:1})
 expect(JSON.stringify(error)).not.toContain('PRIVATE_SECRET')
})
