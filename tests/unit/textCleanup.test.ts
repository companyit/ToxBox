import { expect, test } from 'vitest'
import { cleanupText, type CleanupOperation } from '../../src/utils/textCleanup'

const run = (input: string, operation: Exclude<CleanupOperation, 'replace'> = 'trim') => cleanupText({ input, operation })
const replace = (input: string, find: string, replacement: string) => cleanupText({ input, operation: 'replace', find, replacement })
test('空输入与成功空结果区分，首尾 trim 保留行内空格', () => {
  expect(run('')).toEqual({ status: 'empty' })
  expect(replace('', '', '')).toEqual({ status: 'empty' })
  expect(run(' \t\uFEFF')).toEqual({ status: 'success', output: '' })
  expect(run('  甲  乙\t\r\n\t丙 \r 丁 \n')).toEqual({ status: 'success', output: '甲  乙\n丙\n丁\n' })
})
test('删除空白行，不修改保留行；结尾空行参与行操作', () => {
  expect(run('  A \n\u00a0\r\nB\r\n', 'remove-empty')).toEqual({ status: 'success', output: '  A \nB' })
  expect(run(' \n\t', 'remove-empty')).toEqual({ status: 'success', output: '' })
  expect(run('A\n', 'ascending')).toEqual({ status: 'success', output: '\nA' })
})
test('精确去重，保序，区分大小写、空白与 Unicode 表示', () => {
  expect(run('甲\r乙\r\n甲', 'dedupe')).toEqual({ status: 'success', output: '甲\n乙' })
  expect(run('A\na\nA \né\ne\u0301\nA', 'dedupe')).toEqual({ status: 'success', output: 'A\na\nA \né\ne\u0301' })
  expect(run('\nA\n\n', 'dedupe')).toEqual({ status: 'success', output: '\nA' })
})
test('固定 UTF-16 顺序，空行、重复行、数字及代理对都保留', () => {
  expect(run('b\na\n10\n2', 'ascending')).toEqual({ status: 'success', output: '10\n2\na\nb' })
  expect(run('a\nA\na\n\n😀\n\uE000', 'ascending')).toEqual({ status: 'success', output: '\nA\na\na\n😀\n\uE000' })
  expect(run('b\na\n10\n2', 'descending')).toEqual({ status: 'success', output: 'b\na\n2\n10' })
})
test('普通文本非重叠替换、大小写、空替换及 $ 字面值', () => {
  expect(replace('aaaa', 'aa', 'b')).toEqual({ status: 'success', output: 'bb' })
  expect(replace('aaa', 'aa', '')).toEqual({ status: 'success', output: 'a' })
  expect(replace('aAa', 'a', '$&$1$$')).toEqual({ status: 'success', output: '$&$1$$A$&$1$$' })
  expect(replace('.*.*', '.*', '')).toEqual({ status: 'success', output: '' })
  expect(replace('abc', 'x', 'y')).toEqual({ status: 'success', output: 'abc' })
})
test('输入和两个替换参数都先规范化换行', () => {
  expect(replace('a\r\nb\rc\nd', '\r\n', '\rX\r\n')).toEqual({ status: 'success', output: 'a\nX\nb\nX\nc\nX\nd' })
})
test('主输入按原始 UTF-16 长度限制，不截断', () => {
  expect(run('😀'.repeat(50000)).status).toBe('success')
  expect(run('😀'.repeat(50000) + 'a').status).toBe('error')
  expect(run('\r\n'.repeat(50001)).status).toBe('error')
})
test('查找不能为空，参数 1000/1001 边界', () => {
  expect(replace('a', '', '').status).toBe('error')
  expect(replace('a', 'a'.repeat(1000), 'b'.repeat(1000)).status).toBe('success')
  expect(replace('a', 'a'.repeat(1001), '').status).toBe('error')
  expect(replace('a', 'a', 'b'.repeat(1001)).status).toBe('error')
})
test('预估结果恰好一百万通过，再多拒绝；收缩替换不被误拒绝', () => {
  const result = replace('a'.repeat(1000), 'a', 'b'.repeat(1000))
  expect(result.status).toBe('success')
  if (result.status === 'success') expect(result.output).toHaveLength(1000000)
  expect(replace('a'.repeat(1001), 'a', 'b'.repeat(1000)).status).toBe('error')
  expect(replace('a'.repeat(100000), 'a', '')).toEqual({ status: 'success', output: '' })
})
