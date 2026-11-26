import { expect, test } from 'vitest'
import { testRegex, type RegexFlag } from '../../src/utils/regexTester'

function match(pattern: string, sample: string, flags: RegexFlag[] = []) {
  return testRegex({ pattern, sample, flags })
}

test('reports UTF-16 positions and preserves empty and absent capture values', () => {
  expect(match('(?<id>X)(a?)(z)?', '😀x', ['i'])).toEqual({
    matches: [{
      start: 2, end: 3, text: 'x',
      captures: [
        { label: '组 1', value: 'x' }, { label: '组 2', value: '' },
        { label: '组 3', value: undefined }, { label: 'id', value: 'x' },
      ],
    }],
    limited: false,
  })
})

test('advances empty matches through a surrogate pair and past the end', () => {
  for (const [flags, positions] of [[[], [0, 1, 2]], [['u'], [0, 2]]] as const) {
    expect(match('(?:)', '😀', [...flags])).toEqual({
      matches: positions.map(start => ({ start, end: start, text: '', captures: [] })),
      limited: false,
    })
  }
  expect(match('^$', '')).toEqual({
    matches: [{ start: 0, end: 0, text: '', captures: [] }], limited: false,
  })
})

test('uses selected multiline and dot-all semantics and finds nonoverlapping matches', () => {
  expect(match('^a.b$', 'start\na\nb\nend', ['m', 's'])).toMatchObject({
    matches: [{ start: 6, end: 9, text: 'a\nb' }],
  })
  expect(match('aa', 'aaaaa')).toMatchObject({ matches: [{ start: 0 }, { start: 2 }] })
  expect(match('z', 'aaa')).toEqual({ matches: [], limited: false })
})

test('distinguishes exact and truncated match counts', () => {
  expect(match('.', 'x'.repeat(500))).toHaveProperty('limited', false)
  expect(match('.', 'x'.repeat(501))).toMatchObject({ limited: true })
  expect(match('.', 'x'.repeat(501))).toHaveProperty('matches.length', 500)
})

test('rejects invalid and oversized inputs and limits both output budgets', () => {
  expect(match('', '')).toHaveProperty('error', '请输入正则表达式。')
  expect(match('[', 'PRIVATE')).toHaveProperty('error', '正则表达式语法无效，请检查模式和标志。')
  expect(match('a'.repeat(1_001), '')).toHaveProperty('error')
  expect(match('.', 'x'.repeat(50_001))).toHaveProperty('error')
  expect(match('(((((.*)))))', 'x'.repeat(50_000))).toHaveProperty('error')
  expect(match('()'.repeat(100), 'x'.repeat(500))).toHaveProperty('error')
})
