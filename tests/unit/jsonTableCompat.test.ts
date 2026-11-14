import { expect, test } from 'vitest'
import { convertTable, type TableResult } from '../../src/utils/csvJson'
import { parseJsonTable, JSON_TABLE_NODES } from '../../src/utils/jsonTable'

function success(result: TableResult) {
  expect(result.status).toBe('success')
  if (result.status !== 'success') throw Error('转换未成功')
  return result
}
const json = (input: string, options = {}) => convertTable(input, 'json-to-csv', options)
function cells(input: string, options = {}): string[][] {
  return JSON.parse(success(convertTable(success(json(input, options)).output, 'csv-to-json')).output)
}

test('对象数组字段并集按首次出现顺序，保留整数样式键的原始顺序与空缺', () => {
  const source = '[{"2":"二","1":"一","id":"001"},{"id":"002","active":false}]'
  expect(cells(source)).toEqual([['2','1','id','active'],['二','一','001',''],['','','002','false']])
  expect(success(json(source))).toMatchObject({ rows: 2, columns: 4, format: 'objects', notices: ['missing-cells'] })
})
test('单个完整对象的字符串、布尔、null、嵌套对象/数组全部保留', () => {
  expect(cells('{"id":"001","active":true,"none":null,"user":{"city":"上海"},"tags":[1,"A"]}')).toEqual([
    ['id','active','none','user','tags'],['001','true','null','{"city":"上海"}','[1,"A"]'],
  ])
  expect(success(json('{"a":1}'))).toMatchObject({ rows: 1, columns: 1, format: 'object' })
})
test('大整数、高精小数、负零及指数在直接字段和嵌套内容中不经过Number', () => {
  const numbers = ['9007199254740993','-90071992547409931234567890','0.10000000000000000001','-0','1E+003','1e999','1e-9999']
  for (const number of numbers) {
    expect(cells('[[ '+number+' ]]')).toEqual([[number]])
    expect(cells('{"nested":{"n":'+number+'}}')).toEqual([['nested'],['{"n":'+number+'}']])
  }
})
test('二维混合值、短行和空行保留，矩阵不添加表头', () => {
  expect(cells('[["001",true,null],[2],[],[{"a":1},[1,2]]]')).toEqual([
    ['001','true','null'],['2','',''],['','',''],['{"a":1}','[1,2]',''],
  ])
  expect(success(json('[[1],[2,3]]'))).toMatchObject({ rows: 2, columns: 2, notices: ['missing-cells'] })
})
test('普通/混合数组与全部基本根值使用value列，不跳过null或容器', () => {
  expect(cells('["001",2,true,null,{"a":1},[1,2]]')).toEqual([['value'],['001'],['2'],['true'],['null'],['{"a":1}'],['[1,2]']])
  for (const [input, value] of [['"001"','001'],['true','true'],['false','false'],['null','null'],['-0','-0'],['""','']]) {
    expect(cells(input!)).toEqual([['value'],[value]])
  }
})
test('空表格与无列数据明确区分，空对象记录在存在其他列时仍保留', () => {
  expect(success(json('[]'))).toMatchObject({ rows: 0, columns: 0, output: '' })
  for (const source of ['{}','[{},{}]','[[],[]]']) expect(json(source)).toMatchObject({ status: 'error', code: 'no-columns' })
  expect(cells('[{}, {"a":1}]')).toEqual([['a'],[''],['1']])
})
test('兼容BOM/注释/尾逗号并逐项提示，不破坏URL/字符串里的语法符号', () => {
  const input = '\uFEFF/*头*/[\n{"url":"https://a/b//c","literal":"/*x*/,]","n":1,},//行\n]'
  expect(cells(input)).toEqual([['url','literal','n'],['https://a/b//c','/*x*/,]','1']])
  expect(success(json(input)).notices).toEqual(['bom','comments','trailing-comma'])
  expect(cells('[["a\\\"//b","\\\\/*c*/",],]')).toEqual([['a"//b','\\/*c*/']])
})
test('严格模式拒绝兼容扩展，但仍支持对象及所有JSON值', () => {
  for (const source of ['\uFEFF[1]','[1,]','[1/*x*/]','//x\n[1]']) expect(json(source,{jsonMode:'strict'})).toMatchObject({status:'error',code:'invalid-json'})
  expect(cells('{"a":1}',{jsonMode:'strict'})).toEqual([['a'],['1']])
})
test('不可靠语法不修复：缺失值/连续逗号/裸键/单引号/坏数值/尾垃圾', () => {
  for (const source of ['[,]','[1,,]','[1,,2]','{"a":,}','{"a":1,,}','{a:1}',"{'a':1}",'[undefined]','[NaN]','[Infinity]','[01]','[+1]','[.5]','[1.]','[1e]','[--1]','[1]x','{"a" 1}','[1 2]','/*unclosed','["bad\\x"]','["a\nb"]']) {
    expect(json(source), source).toMatchObject({ status: 'error', code: 'invalid-json' })
  }
})
test('错误位置按原始注释/BOM/CRLF计数且没有输入或解析异常片段', () => {
  const result = json('\uFEFF/* PRIVATE */\r\n{\r\n"secret": }')
  expect(result).toMatchObject({ status: 'error', code: 'invalid-json', line: 3 })
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|secret|SyntaxError/)
})
test('同级重复键与转义后同名拒绝，跨对象同名字段可以正常映射', () => {
  for (const source of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','[{"nested":{"x":1,"x":2}}]']) expect(json(source)).toMatchObject({ status:'error',code:'duplicate-key' })
  expect(cells('[{"a":1},{"a":2}]')).toEqual([['a'],['1'],['2']])
})
test('原型相关键是普通数据，空键和指针转义正确，不改变Object.prototype', () => {
  const source = '{"__proto__":{"polluted":true},"constructor":false,"prototype":"v","a/b":{"~key":[{"":1}]}}'
  expect(cells(source)).toEqual([['__proto__','constructor','prototype','a/b'],['{"polluted":true}','false','v','{"~key":[{"":1}]}']])
  expect(cells(source,{recordPath:'/a~1b/~0key/0'})).toEqual([[''],['1']])
  expect(Object.hasOwn(Object.prototype,'polluted')).toBe(false)
})
test('只显式选择记录路径，不自动丢弃包装字段，拒绝越界/非法指针', () => {
  const input = '{"code":0,"data":{"items":[{"id":"001"},{"id":"002"}]},"~1":false}'
  expect(cells(input,{recordPath:'/data/items'})).toEqual([['id'],['001'],['002']])
  expect(cells(input,{recordPath:'/data/items/1'})).toEqual([['id'],['002']])
  expect(cells(input,{recordPath:'/data/items/0/id'})).toEqual([['value'],['001']])
  expect(cells(input,{recordPath:'/~01'})).toEqual([['value'],['false']])
  expect(cells(input)[0]).toEqual(['code','data','~1'])
  for (const recordPath of ['data.items','/data/missing','/data/items/01','/data/items/-','/data/items/2','/~2','/~','/'+ 'x'.repeat(1000)]) expect(json(input,{recordPath})).toMatchObject({status:'error',code:'record-path'})
})
test('Unicode/空字符检查覆盖键、字符串、嵌套内容和转义，合法代理对保留', () => {
  for (const input of ['{"\\u0000":1}','{"nested":["\\ud800"]}','{"a":"\\u0000"}','["\ud800"]']) expect(json(input)).toMatchObject({status:'error',code:'unicode'})
  expect(cells('{"😀":"𠀀","é":"é"}')).toEqual([['😀','é'],['𠀀','é']])
})
test('表头换行归一后冲突拒绝；嵌套字符串转义保留、直接单元格换行归一', () => {
  expect(json('{"a\\r\\nb":1,"a\\nb":2}')).toMatchObject({status:'error',code:'header-collision'})
  expect(cells('{"direct":"a\\r\\nb","nested":{"x":"a\\r\\nb"}}')).toEqual([['direct','nested'],['a\nb','{"x":"a\\r\\nb"}']])
})
test('1000条对象数据可以加表头，1001条拒绝，100/101列并集边界有效', () => {
  expect(success(json(JSON.stringify(Array.from({length:1000},(_,id)=>({id})))))).toMatchObject({rows:1000,columns:1})
  expect(json(JSON.stringify(Array.from({length:1001},()=>({id:1}))))).toMatchObject({status:'error',code:'row-limit'})
  for(const columns of [100,101]) {
    const data=Array.from({length:columns},(_,i)=>({['k'+i]:i}))
    expect(json(JSON.stringify(data)).status).toBe(columns===100?'success':'error')
  }
})
test('深度30接受、31拒绝；独立读取器节点预算在JSON输入保护之外也生效', () => {
  expect(json('['.repeat(30)+'0'+']'.repeat(30)).status).toBe('success')
  expect(json('['.repeat(31)+'0'+']'.repeat(31))).toMatchObject({status:'error',code:'depth'})
  expect(parseJsonTable('['+'0,'.repeat(JSON_TABLE_NODES)+'0]',{},100000,100)).toMatchObject({status:'error',code:'nodes'})
})
test('受控JSON样本通过严格语法映射，CSV反解后与独立预期逐字段一致', () => {
  for(let n=0;n<40;n++) {
    const object={id:String(n).padStart(3,'0'),name:'甲,"乙"\n'+n,enabled:n%2===0,none:null,nested:{count:n,tags:['A','B']}}
    expect(cells(JSON.stringify(object),{jsonMode:'strict'})).toEqual([Object.keys(object),[object.id,object.name,String(object.enabled),'null',JSON.stringify(object.nested)]])
  }
})

test('严格语法与原生JSON解析器进行受控字符变异对照，不接受非法文法', () => {
  const corpus=new Set<string>()
  for(const source of ['{}','[]','[1,2]','{"a":1,"b":[true,false,null,"x"]}','"x\\n"','-1.25e+02','[[],{}]']) {
    corpus.add(source)
    for(let i=0;i<=source.length;i++)for(const replacement of ['', ' ', 'x', ',', '[', ']', '{', '}', ':', '"', '\\'])corpus.add(source.slice(0,i)+replacement+source.slice(i+1))
  }
  for(const source of corpus) {
    let valid=true
    try{JSON.parse(source)}catch{valid=false}
    const result=json(source,{jsonMode:'strict'})
    if(!valid) {
      expect(result.status,source).toBe('error')
      if(result.status==='error')expect(['invalid-json','duplicate-key'],source).toContain(result.code)
    } else if(result.status==='error')expect(['no-columns','duplicate-key'],source).toContain(result.code)
  }
})
