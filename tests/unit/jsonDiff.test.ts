import { expect, test } from 'vitest'
import { compareJson, JsonDiffFailure, jsonDiffReport } from '../../src/utils/jsonDiff'
import { JsonReader } from '../../src/utils/jsonReader'
test('对象顺序/排版忽略，输出路径确定且缺失与null不同',()=>{
 expect(compareJson('{"b":2,"a":{"x":true}}',' {"a":{"x":true}, "b":2} ').changes).toEqual([])
 expect(compareJson('{"a":null,"data":{"score":95}}','{"data":{"score":96},"new":false}')).toEqual({added:1,removed:1,modified:1,changes:[
  {kind:'remove',path:'/a',before:'null'},{kind:'change',path:'/data/score',before:'95',after:'96'},{kind:'add',path:'/new',after:'false'},
 ]})
})
test('数组按索引、类型变化与新增容器整体报告，支持所有根类型',()=>{
 expect(compareJson('[1,2]','[2,1,3]').changes.map(x=>[x.kind,x.path])).toEqual([['change','/0'],['change','/1'],['add','/2']])
 expect(compareJson('{"x":1}','{"x":{"nested":[true]}}').changes).toEqual([{kind:'change',path:'/x',before:'1',after:'{"nested":[true]}'}])
 expect(compareJson('{}','{"new":[{"a":1}]}').changes).toHaveLength(1)
 for(const source of ['{}','[]','"text"','3.5','true','false','null'])expect(compareJson(source,source).changes).toEqual([])
 expect(compareJson('"1"','1').changes).toEqual([{kind:'change',path:'',before:'"1"',after:'1'}])
})
test('JSON Pointer转义、空键和原型字段安全，错误不泄漏私有字段',()=>{
 expect(compareJson('{"a/b":{"~key":true},"":1}','{"a/b":{"~key":false},"":2}').changes.map(x=>x.path)).toEqual(['/a~1b/~0key','/'])
 expect(compareJson('{"__proto__":{"polluted":1}}','{"__proto__":{"polluted":2}}').changes[0]?.path).toBe('/__proto__/polluted')
 expect(Object.hasOwn(Object.prototype,'polluted')).toBe(false)
 try{compareJson('{}','{\n"PRIVATE_FIELD": }')}catch(error){expect(error).toBeInstanceOf(JsonDiffFailure);expect(error).toMatchObject({code:'invalid-json',side:'after',line:2});expect(JSON.stringify(error)).not.toContain('PRIVATE_FIELD')}
})
test('十进制任意精度比较，等值不同写法不报告，原词元完整展示',()=>{
 for(const [a,b] of [['1','1.0'],['1','1e0'],['-0','0'],['-0e999','0.00'],['12300','1.2300e4'],['0.00100','1e-3'],['1e10000000000000000000000000','10e9999999999999999999999999']])expect(compareJson(a!,b!).changes).toEqual([])
 const result=compareJson('9007199254740993','9007199254740994')
 expect(result.changes[0]).toMatchObject({before:'9007199254740993',after:'9007199254740994'})
 for(const [a,b] of [['1e1000','1e1001'],['1.00000000000000000001','1'],['1e-1000','0']])expect(compareJson(a!,b!).modified).toBe(1)
 for(let n=1;n<=100;n++){
  const digits='9007199254740993'+n, exponent=n-50
  expect(compareJson(digits+'e'+exponent,digits+'.000e'+exponent).changes).toEqual([])
  expect(compareJson(digits+'00e'+(exponent-2),digits+'e'+exponent).changes).toEqual([])
 }
})
test('严格语法、重复键和Unicode校验不沿用CSV兼容模式',()=>{
 for(const source of ['\uFEFF{}','/*a*/{}','[1,]','{"x":1,"x":2}','{"x":1,"\\u0078":2}','["\\ud800"]','{"x":"\\u0000"}',"{'x':1}",'[01]'])expect(()=>compareJson(source,'{}'),source).toThrow()
 expect(()=>compareJson(' \n','{}')).toThrow('missing')
 expect(()=>compareJson('null','')).toThrow('missing')
 expect(compareJson('{"x":"\\u0061"}','{"x":"a"}').changes).toEqual([])
})
test('输入/深度/节点和差异数量边界，超限无部分结果',()=>{
 const source='"'+'x'.repeat(99998)+'"'
 expect(compareJson(source,source).changes).toEqual([])
 expect(()=>compareJson(source+' ','{}')).toThrow('input')
 const deep='['.repeat(30)+'0'+']'.repeat(30)
 expect(compareJson(deep,deep).changes).toEqual([])
 expect(()=>compareJson('['+deep+']','{}')).toThrow('depth')
 expect(()=>new JsonReader('['+'0,'.repeat(50000)+'0]').read()).toThrow('nodes')
 expect(compareJson(JSON.stringify(Array(2000).fill(0)),JSON.stringify(Array(2000).fill(1))).changes).toHaveLength(2000)
 expect(()=>compareJson(JSON.stringify(Array(2001).fill(0)),JSON.stringify(Array(2001).fill(1)))).toThrow('changes')
})
test('长路径重复结果有界，报告预算独立且保持原结果',()=>{
 const key='private'.repeat(1100)
 expect(()=>compareJson(JSON.stringify({[key]:Array(200).fill(0)}),JSON.stringify({[key]:Array(200).fill(1)}))).toThrow('output')
 const result=compareJson('{"a":1,"b":0}','{"a":2,"c":3}')
 const report=jsonDiffReport(result,'change')
 expect(report).toContain('路径 "/a"');expect(report).not.toContain('路径 "/b"')
 expect(jsonDiffReport(result,'change',report.length)).toBe(report)
 expect(()=>jsonDiffReport(result,'change',report.length-1)).toThrow('report')
 expect(result.changes).toHaveLength(3)
 expect(jsonDiffReport(compareJson('null','1'),'all')).toContain('路径 ""（根节点）')
})
