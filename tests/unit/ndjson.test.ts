import { expect, test } from 'vitest'
import { convertNdjson, validateNdjson } from '../../src/utils/ndjson'

test('preserves value types, field order, and number spellings in both directions', () => {
  const rows = '{"10":-0,"2":1.20E+3,"id":9007199254740993}\n[null,true]\n"text\\nvalue"\nfalse'
  const array = '[{"10":-0,"2":1.20E+3,"id":9007199254740993},[null,true],"text\\nvalue",false]'
  expect(convertNdjson(rows.replaceAll('\n', '\r\n\t\r\n'), 'to-array')).toEqual({ output: array, count: 4 })
  expect(convertNdjson(array, 'to-lines')).toEqual({ output: rows, count: 4 })
})

test('handles empty success and reports physical line errors without input excerpts', () => {
  expect(convertNdjson(' \t\r\n\n', 'to-array')).toEqual({ output: '[]', count: 0 })
  expect(convertNdjson('[]', 'to-lines')).toEqual({ output: '', count: 0 })
  expect(() => convertNdjson('1\r\n\t\r\n{"PRIVATE":1,"PRIVATE":2}', 'to-array')).toThrow('第 3 行：含有重复字段名。')
  expect(() => convertNdjson('true false', 'to-array')).toThrow('第 1 行：JSON 语法无效。')
  expect(() => convertNdjson('\uFEFF', 'to-array')).toThrow(/第 1 行/)
  expect(() => convertNdjson('["\\u0000"]', 'to-lines')).toThrow(/Unicode/)
  expect(() => convertNdjson('{}', 'to-lines')).toThrow(/顶层必须是数组/)
})

test('keeps equal record depth budgets for both directions', () => {
  for (const depth of [30, 31]) {
    const record = '['.repeat(depth) + '0' + ']'.repeat(depth)
    const toArray = () => convertNdjson(record, 'to-array')
    const toLines = () => convertNdjson('[' + record + ']', 'to-lines')
    if (depth === 30) {
      expect(toArray().count).toBe(1)
      expect(toLines().output).toBe(record)
    } else {
      expect(toArray).toThrow(/30 层/)
      expect(toLines).toThrow(/30 层/)
    }
  }
})

test('enforces line, record, input, and output sizes', () => {
  const records = Array<string>(2_000).fill('0')
  expect(convertNdjson(records.join('\n'), 'to-array').count).toBe(2_000)
  expect(() => convertNdjson([...records, '1'].join('\n'), 'to-array')).toThrow(/第 2001 行/)
  expect(() => convertNdjson('[' + [...records, '1'].join(',') + ']', 'to-lines')).toThrow(/2,000 条/)
  const line = JSON.stringify('a'.repeat(49_997))
  expect(() => convertNdjson(JSON.stringify('a'.repeat(49_999)), 'to-array')).toThrow(/单行/)
  expect(() => convertNdjson('[' + JSON.stringify('a'.repeat(49_999)) + ']', 'to-lines')).toThrow(/第 1 条记录/)
  expect(() => convertNdjson([line, line, line, line].join('\n'), 'to-array')).toThrow(/输出超过/)
  expect(() => convertNdjson(' '.repeat(200_001), 'to-lines')).toThrow(/输入最多/)
})

test('applies the node budget across records, excluding the array wrapper', () => {
  const record = '[' + Array<string>(24_999).fill('0').join(',') + ']'
  const rows = record + '\n' + record
  const array = '[' + record + ',' + record + ']'
  expect(convertNdjson(rows, 'to-array').output).toBe(array)
  expect(convertNdjson(array, 'to-lines').output).toBe(rows)
  expect(() => convertNdjson(rows + '\n0', 'to-array')).toThrow(/第 3 行.*总节点/)
  expect(() => convertNdjson(array.slice(0, -1) + ',0]', 'to-lines')).toThrow(/总节点/)
})

test('collects multiple fixed diagnostics with physical line numbers', () => {
  const result = validateNdjson('true\r\n\t\r\nPRIVATE\r\n{"secret":1,"secret":2}\r\nnull')
  expect(result).toEqual({
    valid: false,
    message: '校验完成。通过 2 条，错误 2 条。',
    report: '通过 2 条，错误 2 条。\n第 3 行：JSON 语法无效。\n第 4 行：含有重复字段名。',
  })
  expect(validateNdjson('true\nnull').valid).toBe(true)
  expect(validateNdjson('\n\t').report).toBe('通过 0 条，错误 0 条。')
  expect(validateNdjson(' '.repeat(50_001) + '\n1').report).toContain('第 1 行：单行最多')
})

test('limits displayed issues and marks unvalidated rows at global limits', () => {
  const invalid = validateNdjson(Array<string>(51).fill('bad').join('\n'))
  expect(invalid.report).toContain('错误 51 条')
  expect(invalid.report).toContain('仅列出前 50 条错误')
  expect(invalid.report).not.toContain('第 51 行')
  const capped = validateNdjson(Array<string>(2_001).fill('0').join('\n'))
  expect(capped.valid).toBe(false)
  expect(capped.message).toBe('校验已中止。通过 2000 条，错误 0 条。')
  expect(capped.report).toContain('第 2001 行停止')
  const record = '[' + Array<string>(24_999).fill('0').join(',') + ']'
  const nodes = validateNdjson(record + '\n' + record + '\n0')
  expect(nodes.message).toBe('校验已中止。通过 2 条，错误 0 条。')
  expect(nodes.report).toContain('第 3 行停止。总节点数超过')
})

test('pretty arrays preserve original number tokens, field order and empty containers', () => {
  const records = '{"10":-0,"2":1.20E+3,"id":9007199254740993,"items":[true,{}]}\n[]'
  expect(convertNdjson(records, 'to-array', 'pretty')).toEqual({
    count: 2,
    output: [
      '[', '  {', '    "10": -0,', '    "2": 1.20E+3,', '    "id": 9007199254740993,',
      '    "items": [', '      true,', '      {}', '    ]', '  },', '  []', ']',
    ].join('\n'),
  })
  expect(convertNdjson('', 'to-array', 'pretty')).toEqual({ count: 0, output: '[]' })
  expect(convertNdjson('[[1],{}]', 'to-lines', 'pretty').output).toBe('[1]\n{}')
})

test('counts indentation against the output budget and permits compact retry', () => {
  const line = '[' + Array<string>(20_000).fill('0').join(',') + ']'
  const records = line + '\n' + line
  expect(() => convertNdjson(records, 'to-array', 'pretty')).toThrow(/改用紧凑格式/)
  expect(convertNdjson(records, 'to-array').count).toBe(2)
})
