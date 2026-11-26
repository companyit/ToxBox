import { expect, test } from 'vitest'
import { redactJson, RedactFailure } from '../../src/utils/jsonRedact'
const redact=(source:string,paths:string[],replacement='***')=>redactJson(source,JSON.stringify(paths),replacement)
function failure(run:()=>unknown,code:string){try{run();throw Error('预期失败')}catch(e){expect(e).toBeInstanceOf(RedactFailure);expect((e as RedactFailure).code).toBe(code)}}
test('仅替换指定字段与数组下标，未选大整数/指数/负零原词元保持',()=>{
 const source='{"id":9007199254740993,"n":1e9999,"z":-0,"data":{"email":"private","ok":true},"users":[{"phone":"123","note":null}]}'
 const result=redact(source,['/data/email','/users/0/phone'])
 expect(result.count).toBe(2);expect(result.output).toContain('9007199254740993');expect(result.output).toContain('1e9999');expect(result.output).toContain('"z": -0')
 expect(result.output).not.toContain('private');expect(result.output).not.toContain('123')
 expect(result.output).toContain('"ok": true');expect(result.output).toContain('"note": null')
})
test('根、容器、空字符串及原型字段安全处理，字段和数组顺序保持',()=>{
 for(const value of ['null','1','"a"','[]','{}','true'])expect(redact(value,['']).output).toBe('"***"')
 const source='{"2":1,"1":2,"__proto__":{"x":1},"constructor":false,"prototype":null,"":3}'
 const result=redact(source,['/__proto__','/constructor','/prototype','/'],'')
 expect(result.output).toBe('{\n  "2": 1,\n  "1": 2,\n  "__proto__": "",\n  "constructor": "",\n  "prototype": "",\n  "": ""\n}')
 expect(Object.prototype).not.toHaveProperty('x')
})
test('Pointer转义、换行/反斜杠/Unicode字段及替换文字仅按JSON字符串转义',()=>{
 const obj={'a/b':{'~key':1},'a\nb':2,'\\':3,'中文😀':4}
 const value='"\\\n😀<img>'
 const result=redact(JSON.stringify(obj),['/a~1b/~0key','/a\nb','/\\','/中文😀'],value)
 expect(JSON.parse(result.output)).toEqual({'a/b':{'~key':value},'a\nb':value,'\\':value,'中文😀':value})
})
test('无效/缺失/重复/祖先重叠整次拒绝，错误只含固定代码与序号',()=>{
 const source='{"a":{"b":1},"list":[0],"01":1}'
 for(const path of ['/PRIVATE','/list/01','/list/-1','/list/1','/list/1e0','/list/9007199254740993','a','/a~2','/a~'])failure(()=>redact(source,[path]),'path')
 for(const paths of [['/a','/a'],['','']])failure(()=>redact(source,paths),'duplicate-path')
 for(const paths of [['/a','/a/b'],['/a/b','/a'],['','/a']])failure(()=>redact(source,paths),'overlap')
 expect(redact(source,['/01']).output).toContain('"01": "***"')
 try{redact(source,['/a','/PRIVATE'])}catch(e){expect(e).toMatchObject({code:'path',field:'paths',item:2});expect(String(e)).not.toContain('PRIVATE')}
})
test('源及路径配置严格校验，重复键/Unicode/深度与非法配置拒绝',()=>{
 for(const source of ['\uFEFF{}','/*x*/{}','{"a":1,}','{'])failure(()=>redact(source,['']),'invalid-json')
 failure(()=>redact('{"a":1,"a":2}',['/a']),'duplicate-key')
 for(const source of ['"\\uD800"','"\\u0000"'])failure(()=>redact(source,['']),'unicode')
 failure(()=>redact('['.repeat(31)+'0'+']'.repeat(31),['']),'depth')
 for(const config of ['[]','{}','[1]','[true]','[null]','[[]]'])failure(()=>redactJson('{}',config,'***'),'paths')
 failure(()=>redactJson('{}','["/a",]','***'),'invalid-json')
})
test('源/配置/路径数量/单路径与替换文本资源边界',()=>{
 expect(redact('"'+'x'.repeat(99998)+'"',['']).output).toBe('"***"')
 failure(()=>redact('x'.repeat(100001),['']),'input');failure(()=>redact(' \n',['']),'missing')
 failure(()=>redactJson('{}',' '.repeat(10001),'***'),'config-limit')
 const obj=Object.fromEntries(Array.from({length:100},(_,i)=>['k'+i,i]))
 expect(redact(JSON.stringify(obj),Object.keys(obj).map(k=>'/'+k)).count).toBe(100)
 failure(()=>redact('{}',Array(101).fill('')),'paths')
 const key='x'.repeat(999);expect(redact(JSON.stringify({[key]:1}),['/'+key]).count).toBe(1)
 failure(()=>redact('{}',['/'+'x'.repeat(1000)]),'path')
 expect(redact('{}',[''],'x'.repeat(200)).output).toHaveLength(202)
 for(const value of ['x'.repeat(201),'\u0000','\uD800'])failure(()=>redact('{}',[''],value),'replacement')
})
test('独立标准JSON格式对照及百万输出预算恰好接受、多一码元拒绝',()=>{
 const obj={a:[1,'甲',true,null,{},[]],b:{x:'"\\\n',y:'😀'}}
 expect(redact(JSON.stringify(obj),['/b/x']).output).toBe(JSON.stringify({...obj,b:{x:'***',y:'😀'}},null,2))
 const rows:Array<number|string>=Array(15000).fill(0),path='/' + Array(30).fill('0').join('/')
 const encode=()=> '['.repeat(29)+JSON.stringify(rows)+']'.repeat(29)
 const base=redact(encode(),[path])
 rows[1]='x'.repeat(1000000-base.output.length-1)
 expect(encode().length).toBeLessThanOrEqual(100000)
 expect(redact(encode(),[path]).output).toHaveLength(1000000)
 rows[1]+='x';failure(()=>redact(encode(),[path]),'output')
})
