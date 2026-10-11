import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/textStatistics.test.ts')
import assert from 'node:assert/strict'
import { analyzeText } from '../../src/utils/textStatistics.ts'

const vectors: [string, string, number[]][] = [
  ['U01', '', [0,0,0,0,0]],
  ['U02', ' \t', [2,0,0,1,0]],
  ['U03', 'a\r\nb\rc\n', [7,3,3,4,3]],
  ['U04', '\n', [1,0,0,2,0]],
  ['U05', 'a\n', [2,1,1,2,1]],
  ['U06', '你好 world', [8,7,2,1,1]],
  ['U07', '你好world', [7,7,1,1,1]],
  ['U08', 'hello, world!', [13,12,2,1,1]],
  ['U09', '😀', [1,1,1,1,1]],
  ['U10', '👨‍👩‍👧‍👦', [7,7,1,1,1]],
  ['U11', 'e\u0301 é', [4,3,2,1,1]],
  ['U12', 'a\u00a0b\u3000c\ufeff', [6,3,3,1,1]],
  ['U13', 'a\u2028b\u2029', [4,2,2,3,2]],
  ['U14', '\u200b\u200d\u0085', [3,3,1,1,1]],
  ['U15', '... 😀', [5,4,2,1,1]],
  ['U16', ' \n\t\r\n', [5,0,0,3,0]],
  ['U17', '👍🏽 🇨🇳', [5,4,2,1,1]],
  ['U18', '\ud800', [1,1,1,1,1]],
  ['U19', 'a\v\fb', [4,2,2,1,1]],
]
function counts(text: string): number[] {
  const result = analyzeText(text)
  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') throw new Error('Expected valid text')
  const s = result.statistics
  return [s.characterCount, s.nonWhitespaceCharacterCount, s.segmentCount, s.lineCount, s.nonEmptyLineCount]
}
for (const [id, input, expected] of vectors) {
  test(id, () => assert.deepEqual(counts(input), expected))
}
const whitespaceCodes = [
  9,10,11,12,13,32,0xa0,0x1680,
  ...Array.from({ length: 11 }, (_, i) => 0x2000 + i),
  0x2028,0x2029,0x202f,0x205f,0x3000,0xfeff,
]
for (const code of whitespaceCodes) {
  test(`W U+${code.toString(16)}`, () => {
    const breaksLine = [10,13,0x2028,0x2029].includes(code)
    const character = String.fromCodePoint(code)
    assert.deepEqual(counts(character), [1,0,0,breaksLine ? 2 : 1,0])
    assert.deepEqual(counts(`a${character}b`), [3,2,2,breaksLine ? 2 : 1,breaksLine ? 2 : 1])
  })
}
for (const code of [0x85,0x180e,0x200b,0x200d]) {
  test(`non-W U+${code.toString(16)}`, () => {
    assert.deepEqual(counts(String.fromCodePoint(code)), [1,1,1,1,1])
  })
}
test('100000 ASCII code units accepted', () => {
  assert.deepEqual(counts('a'.repeat(100000)), [100000,100000,1,1,1])
})
test('100001 ASCII code units rejected without stale results', () => {
  assert.deepEqual(analyzeText('a'.repeat(100001)), { status: 'too-long', limit: 100000, actualCodeUnits: 100001 })
})
test('50000 Emoji fit the code-unit limit', () => {
  assert.deepEqual(counts('😀'.repeat(50000)), [50000,50000,1,1,1])
})
test('Emoji limit plus one code unit rejected', () => {
  assert.deepEqual(analyzeText('😀'.repeat(50000) + 'a'), { status: 'too-long', limit: 100000, actualCodeUnits: 100001 })
})
test('CRLF and adjacent line boundaries', () => {
  assert.deepEqual(counts('a\r\n\r\nb\r\rc'), [9,3,3,5,3])
})
test('repeated calls have independent results', () => {
  const first = analyzeText('a')
  counts('b\nc')
  assert.deepEqual(analyzeText(''), { status: 'ok', statistics: { characterCount: 0, nonWhitespaceCharacterCount: 0, segmentCount: 0, lineCount: 0, nonEmptyLineCount: 0 } })
  assert.deepEqual(first, analyzeText('a'))
})
