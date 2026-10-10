import type { TextAnalysis, TextStatistics } from '../types/textStatistics.ts'

export const TEXT_CODE_UNIT_LIMIT = 100_000

// 固定集合 W：零宽字符等不自动视为空白。
function isWhitespace(code: number): boolean {
  return (code >= 0x0009 && code <= 0x000d)
    || code === 0x0020 || code === 0x00a0 || code === 0x1680
    || (code >= 0x2000 && code <= 0x200a)
    || code === 0x2028 || code === 0x2029 || code === 0x202f
    || code === 0x205f || code === 0x3000 || code === 0xfeff
}

export function analyzeText(text: string): TextAnalysis {
  if (text.length > TEXT_CODE_UNIT_LIMIT) {
    return { status: 'too-long', limit: TEXT_CODE_UNIT_LIMIT, actualCodeUnits: text.length }
  }
  const statistics: TextStatistics = {
    characterCount: 0,
    nonWhitespaceCharacterCount: 0,
    segmentCount: 0,
    lineCount: text.length === 0 ? 0 : 1,
    nonEmptyLineCount: 0,
  }
  let inSegment = false
  let lineHasContent = false
  let previousWasCR = false

  for (const character of text) {
    const code = character.codePointAt(0)!
    const whitespace = isWhitespace(code)
    statistics.characterCount++
    if (whitespace) {
      inSegment = false
    } else {
      statistics.nonWhitespaceCharacterCount++
      if (!inSegment) statistics.segmentCount++
      inSegment = true
    }
    const isLineBreak = code === 0x000d || code === 0x000a || code === 0x2028 || code === 0x2029
    if (isLineBreak) {
      if (!(code === 0x000a && previousWasCR)) {
        statistics.lineCount++
        if (lineHasContent) statistics.nonEmptyLineCount++
        lineHasContent = false
      }
    } else if (!whitespace) {
      lineHasContent = true
    }
    previousWasCR = code === 0x000d
  }
  if (lineHasContent) statistics.nonEmptyLineCount++
  return { status: 'ok', statistics }
}
