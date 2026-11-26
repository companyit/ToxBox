import { expect, test } from 'vitest'
import { parseUrlQuery } from '../../src/utils/urlQuery'

test('preserves order, duplicates, empty keys and the presence of an equals sign', () => {
  expect(parseUrlQuery('?a=1&&a=2&flag&empty=&=x=y&literal=#text', 'query', false)).toEqual({
    parameters: [
      { name: 'a', value: '1' },
      { name: 'a', value: '2' },
      { name: 'flag', value: null },
      { name: 'empty', value: '' },
      { name: '', value: 'x=y' },
      { name: 'literal', value: '#text' },
    ],
  })
})

test('validates complete URLs and reads only their raw query', () => {
  expect(parseUrlQuery('https://example.test/a?x=?q%23v#ignored=%ZZ', 'url', false))
    .toEqual({ parameters: [{ name: 'x', value: '?q#v' }] })
  expect(parseUrlQuery('https://example.test/#fragment?x=1', 'url', false)).toEqual({ parameters: [] })
  for (const url of ['//example.test/?x=1', 'ftp://example.test', 'https:///example.test', 'https://?x=1', 'http://example.test:99999']) {
    expect(parseUrlQuery(url, 'url', false)).toHaveProperty('error')
  }
})

test('decodes once and applies the selected plus semantics to names and values', () => {
  const query = 'a+b=%2B+%2526'
  expect(parseUrlQuery(query, 'query', false)).toEqual({ parameters: [{ name: 'a+b', value: '++%26' }] })
  expect(parseUrlQuery(query, 'query', true)).toEqual({ parameters: [{ name: 'a b', value: '+ %26' }] })
})

test('rejects invalid escape sequences without returning partial results or input', () => {
  for (const invalid of ['%', '%GG', '%C3%28', '%ED%A0%80']) {
    expect(parseUrlQuery('ok=1&private=' + invalid, 'query', false))
      .toEqual({ error: '第 2 项包含无效的百分号转义或 UTF-8 编码。' })
  }
})

test('enforces input and parameter limits inclusively', () => {
  expect(parseUrlQuery('a'.repeat(20_000), 'query', false)).toHaveProperty('parameters.length', 1)
  expect(parseUrlQuery('a'.repeat(20_001), 'query', false)).toHaveProperty('error')
  expect(parseUrlQuery('a&'.repeat(500), 'query', false)).toHaveProperty('parameters.length', 500)
  expect(parseUrlQuery('a&'.repeat(501), 'query', false)).toHaveProperty('error')
})
