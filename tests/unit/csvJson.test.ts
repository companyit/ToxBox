import { expect, test } from 'vitest'
import { convertTable, serializeTable, type TableResult } from '../../src/utils/csvJson'
const csv = (input: string) => convertTable(input, 'csv-to-json')
const json = (input: string) => convertTable(input, 'json-to-csv')
function success(result: TableResult) {
  expect(result.status).toBe('success')
  if (result.status !== 'success') throw Error('未成功')
  return result
}
test('前导零、公式样式、空白和表头都作为普通字符串，保留原顺序', () => {
  const values = [['编号', ' 值 '], ['001', '=1+2'], ['002', 'true']]
  const result = success(csv('编号, 值 \n001,=1+2\n002,true'))
  expect(JSON.parse(result.output)).toEqual(values)
  expect(result).toMatchObject({ rows: 3, columns: 2 })
  expect(success(json(result.output)).output).toBe('"编号"," 值 "\n"001","=1+2"\n"002","true"')
})
test('引号内逗号、连续转义引号、多行和混合换行', () => {
  const result = success(csv('"甲,乙","他说""好"""\r\n"a\rb\r\nc\nd",""'))
  expect(JSON.parse(result.output)).toEqual([['甲,乙', '他说"好"'], ['a\nb\nc\nd', '']])
})
test('尾逗号、单个末尾换行、连续空行及开头一个 BOM', () => {
  for (const [input, expected] of [
    ['a,', [['a', '']]], ['a\n', [['a']]], ['a\n\n', [['a'], ['']]], ['\n', [['']]], [',', [['', '']]], ['""', [['']]],
    ['\uFEFF\uFEFFa', [['\uFEFFa']]], ['a,\uFEFFb', [['a', '\uFEFFb']]],
  ] as const) expect(JSON.parse(success(csv(input)).output)).toEqual(expected)
  expect(csv('')).toEqual({ status: 'empty' })
  expect(csv('\uFEFF')).toEqual({ status: 'empty' })
  expect(json('')).toEqual({ status: 'empty' })
  expect(success(json('[]'))).toMatchObject({ output: '', rows: 0, columns: 0 })
  expect(success(json('[[""]]')).output).toBe('""')
})
test('裸引号、不闭合、闭引号后垃圾或空白均拒绝', () => {
  for (const input of ['a"b', '"a', '"a"b', '"a" ', ' "a"', '"""', '"a"\t,b']) expect(csv(input)).toEqual({ status: 'error', code: 'invalid-csv' })
})
test('严格矩形，字段不自动转换类型', () => {
  for (const input of ['a,b\nc', ',\n\n', 'a\nb,c']) expect(csv(input)).toEqual({ status: 'error', code: 'shape' })
  for (const value of [{ a: 1 }, ['a'], [[]], [['a'], ['b', 'c']], [[1]], [[null]], [[true]], [[{ a: 'b' }]]]) expect(json(JSON.stringify(value)).status).toBe('error')
  expect(success(json('[["001","a\\\"b"]]')).output).toBe('"001","a""b"')
})
test('JSON 严格语法和深度扫描，字符串中的转义/括号不计深度', () => {
  for (const input of ['\uFEFF[]', '[["a",]]', '/*x*/[]', '[', ' ']) expect(json(input)).toEqual({ status: 'error', code: 'invalid-json' })
  expect(json('[[["a"]]]')).toEqual({ status: 'error', code: 'depth' })
  expect(success(json(JSON.stringify([['[[{\\"', '\r\n\r']]))).output).toBe('"[[{\\""","\n\n"')
})
test('Unicode 拒绝覆盖原文和 JSON 转义后的字段，合法代理对保留', () => {
  for (const value of ['\u0000', '\uD800', '\uDC00', '\uD800a']) {
    expect(csv(value)).toEqual({ status: 'error', code: 'unicode' })
    expect(json(JSON.stringify([[value]]))).toEqual({ status: 'error', code: 'unicode' })
  }
  expect(JSON.parse(success(csv('😀,é\ne\u0301,𠀀')).output)).toEqual([['😀', 'é'], ['e\u0301', '𠀀']])
})
test('输入原始码元边界，不先缩短 CRLF/BOM，也不截断', () => {
  expect(csv('a'.repeat(100000)).status).toBe('success')
  expect(csv('a'.repeat(100001))).toEqual({ status: 'error', code: 'input-limit' })
  expect(csv('\r\n'.repeat(50001))).toEqual({ status: 'error', code: 'input-limit' })
  expect(json(' '.repeat(100001))).toEqual({ status: 'error', code: 'input-limit' })
  expect(json(JSON.stringify([['a'.repeat(99994)]]))).toMatchObject({ status: 'success' })
})
test('两个方向均检查 1000/1001 行及 100/101 列边界', () => {
  for (const count of [1000, 1001]) {
    const values = Array.from({ length: count }, () => ['x'])
    for (const result of [csv(values.map(row => row.join(',')).join('\n')), json(JSON.stringify(values))]) expect(result.status).toBe(count === 1000 ? 'success' : 'error')
  }
  for (const count of [100, 101]) {
    const values = [Array.from({ length: count }, () => 'x')]
    for (const result of [csv(values[0]!.join(',')), json(JSON.stringify(values))]) expect(result.status).toBe(count === 100 ? 'success' : 'error')
  }
})
test('JSON 转义、缩进与 CSV 引号预估长度和独立标准输出一致', () => {
  const values = [['', '\b\t\n\f', '\u0001\u001f', '\\"$&'], ['😀', 'a,b', '  ', 'x\u2028y']]
  expect(success(serializeTable(values, 'csv-to-json')).output).toBe(JSON.stringify(values, null, 2))
  const expectedCsv = '"","\b\t\n\f","\u0001\u001f","\\""$&"\n"😀","a,b","  ","x\u2028y"'
  expect(success(serializeTable(values, 'json-to-csv')).output).toBe(expectedCsv)
})
test('独立序列化预算恰好 1000000 接受，多一码元拒绝，无部分结果', () => {
  for (const [direction, overhead] of [['csv-to-json', 18], ['json-to-csv', 2]] as const) {
    const accepted = serializeTable([['x'.repeat(1000000 - overhead)]], direction)
    expect(success(accepted).output).toHaveLength(1000000)
    expect(serializeTable([['x'.repeat(1000001 - overhead)]], direction)).toEqual({ status: 'error', code: 'output-limit' })
  }
})
test('受控多样本规范化往返保留单元格，不依赖相同序列化形式', () => {
  const atoms = ['', '001', '甲,乙', '"', '\r\n', '\r', '😀', ' $& ', '[{\\"', 'é', 'e\u0301']
  for (let n = 1; n <= 40; n++) {
    const values = Array.from({ length: 1 + n % 5 }, (_, row) => Array.from({ length: 1 + n % 4 }, (_, column) => atoms[(n + row * 3 + column) % atoms.length]!))
    const encoded = success(json(JSON.stringify(values)))
    expect(JSON.parse(success(csv(encoded.output)).output)).toEqual(values.map(row => row.map(cell => cell.replace(/\r\n?/g, '\n'))))
  }
})
