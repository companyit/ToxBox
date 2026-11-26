import { encodeJsonValue, writePrettyJson, JsonFailure, JsonReader, JSON_TABLE_DEPTH, JSON_TABLE_NODES, type JsonReadCode, type JsonValue } from './jsonReader'

export type NdjsonDirection = 'to-array' | 'to-lines'
export type NdjsonArrayFormat = 'compact' | 'pretty'
export const NDJSON_TEXT_LIMIT = 200_000
const lineLimit = 50_000
const recordLimit = 2_000
const recordLimitMessage = '最多允许 2,000 条记录。'
const errors: Record<JsonReadCode, string> = {
  'invalid-json': 'JSON 语法无效。',
  'duplicate-key': '含有重复字段名。',
  unicode: '含有无效 Unicode 字符或空字符。',
  nodes: '总节点数超过 50,000。',
  depth: '单条记录超过 30 层容器。',
}

function readError(failure: unknown, prefix = ''): Error {
  return failure instanceof JsonFailure ? new Error(prefix + errors[failure.code]) : new Error('无法转换，请重试。')
}

type LineCheck = { line: number; value: JsonValue } | { line: number; error: string; stopped?: boolean }

function* checkLines(source: string): Generator<LineCheck> {
  let remainingNodes = JSON_TABLE_NODES
  let records = 0
  for (const [index, text] of source.split(/\r?\n/).entries()) {
    const line = index + 1
    const overlong = text.length > lineLimit
    if (!overlong && /^[ \t\r]*$/.test(text)) continue
    if (records === recordLimit) {
      yield { line, error: recordLimitMessage, stopped: true }
      return
    }
    records++
    if (overlong) {
      yield { line, error: '单行最多 50,000 个码元。' }
      continue
    }

    const reader = new JsonReader(text, remainingNodes)
    let check: LineCheck
    try {
      check = { line, value: reader.read() }
    } catch (failure) {
      const exhausted = failure instanceof JsonFailure && failure.code === 'nodes'
      check = { line, error: readError(failure).message, stopped: exhausted }
    }
    remainingNodes -= reader.nodesRead
    yield check
    if ('error' in check && check.stopped) return
  }
}

export function validateNdjson(source: string): { report: string; message: string; valid: boolean } {
  if (source.length > NDJSON_TEXT_LIMIT) throw new Error('输入最多 200,000 个码元。')
  let passed = 0
  let invalid = 0
  let stopped = ''
  const details: string[] = []
  for (const check of checkLines(source)) {
    if ('value' in check) {
      passed++
      continue
    }
    const detail = `第 ${check.line} 行：${check.error}`
    if (check.stopped) {
      stopped = `校验在第 ${check.line} 行停止。${check.error}该行及后续内容未完成校验。`
      break
    }
    invalid++
    if (details.length < 50) details.push(detail)
  }
  const summary = `通过 ${passed} 条，错误 ${invalid} 条。`
  const truncated = invalid > details.length ? '仅列出前 50 条错误。' : ''
  return {
    valid: !stopped && invalid === 0,
    report: [summary, stopped, truncated, ...details].filter(Boolean).join('\n'),
    message: stopped ? `校验已中止。${summary}` : `校验完成。${summary}`,
  }
}

function prettyArray(source: string): { output: string; count: number } {
  const parts: string[] = []
  let length = 0
  let count = 0
  function write(chunk: string) {
    length += chunk.length
    if (length > NDJSON_TEXT_LIMIT) throw new Error('缩进后超过 200,000 个码元，请改用紧凑格式。')
    parts.push(chunk)
  }

  write('[')
  for (const check of checkLines(source)) {
    if ('error' in check) throw new Error(`第 ${check.line} 行：${check.error}`)
    write(count++ ? ',\n  ' : '\n  ')
    writePrettyJson(check.value, write, 1)
  }
  write(count ? '\n]' : ']')
  return { output: parts.join(''), count }
}

export function convertNdjson(source: string, direction: NdjsonDirection, format: NdjsonArrayFormat = 'compact'): { output: string; count: number } {
  if (source.length > NDJSON_TEXT_LIMIT) throw new Error('输入最多 200,000 个码元。')

  if (direction === 'to-array' && format === 'pretty') return prettyArray(source)

  const lines: string[] = []
  const toArray = direction === 'to-array'
  let size = toArray ? 2 : 0
  function append(line: string) {
    size += line.length + (lines.length ? 1 : 0)
    if (size > NDJSON_TEXT_LIMIT) throw new Error('输出超过 200,000 个码元。')
    lines.push(line)
  }

  if (toArray) {
    for (const check of checkLines(source)) {
      if ('error' in check) throw new Error(`第 ${check.line} 行：${check.error}`)
      append(encodeJsonValue(check.value))
    }
  } else {
    let records
    try {
      // The array wrapper is not a record and consumes neither record depth nor the node budget.
      records = new JsonReader(source, JSON_TABLE_NODES + 1, JSON_TABLE_DEPTH + 1).read()
    } catch (failure) {
      throw readError(failure)
    }
    if (!Array.isArray(records)) throw new Error('JSON 顶层必须是数组。')
    if (records.length > recordLimit) throw new Error(recordLimitMessage)
    for (const [index, value] of records.entries()) {
      const line = encodeJsonValue(value)
      if (line.length > lineLimit) throw new Error(`第 ${index + 1} 条记录超过 50,000 个码元。`)
      append(line)
    }
  }

  const output = toArray ? '[' + lines.join(',') + ']' : lines.join('\n')
  return { output, count: lines.length }
}
