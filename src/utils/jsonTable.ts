import { JsonReader, JsonNumber, JsonFailure, encodeJsonValue as encodeJson, validJsonUnicode as validTableUnicode, type JsonValue } from './jsonReader'
export { JSON_TABLE_DEPTH, JSON_TABLE_NODES, validJsonUnicode as validTableUnicode } from './jsonReader'
export type JsonTableError = 'invalid-json' | 'depth' | 'nodes' | 'unicode' | 'duplicate-key' | 'record-path' | 'no-columns' | 'header-collision' | 'row-limit' | 'column-limit'
export type JsonTableFormat = 'matrix' | 'objects' | 'object' | 'values' | 'value'
export type JsonTableOptions = { jsonMode?: 'compatible' | 'strict'; recordPath?: string; recordScope?: 'root' | 'each'; flattenObjects?: boolean }
export const jsonTableNotices = {
  'flattened-objects': '嵌套对象已展开为点分字段；字段名中的点和反斜杠已转义，数组及空对象保留为 JSON 文本。',
  bom: '已兼容开头的 BOM，原输入保持不变。',
  comments: '已忽略 JSON 注释，原输入保持不变。',
  'trailing-comma': '已兼容末尾逗号，原输入保持不变。',
  'missing-cells': '缺失字段或短行已补为空字段，未删除记录。',
  'nested-values': '嵌套对象和数组已保留为 JSON 文本，未展开字段。',
  'mixed-array': '根数组包含不同结构，已按 value 单列保留各项。',
} as const
export type JsonTableNotice = keyof typeof jsonTableNotices
type ParsedTable = { status: 'success'; table: string[][]; records: number; header: boolean; format: JsonTableFormat; notices: JsonTableNotice[] }
export type JsonTableResult = ParsedTable | { status: 'error'; code: JsonTableError; line?: number; column?: number }

class TableFailure extends Error {
  constructor(readonly code: JsonTableError, readonly offset?: number) { super(code) }
}
const whitespace = (ch: string) => ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n'

// Replace supported syntax extensions with spaces so original line/column offsets survive.
function compatibleSource(input: string, notices: Set<JsonTableNotice>): string {
  const chars = input.split('')
  if (input.startsWith('\uFEFF')) { chars[0] = ' '; notices.add('bom') }
  let quoted = false, escaped = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quoted) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') quoted = false
    } else if (ch === '"') quoted = true
    else if (ch === '/' && input[i + 1] === '/') {
      let end = i + 2
      while (end < input.length && input[end] !== '\r' && input[end] !== '\n') end++
      for (let k = i; k < end; k++) chars[k] = ' '
      notices.add('comments'); i = end - 1
    } else if (ch === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2)
      if (end < 0) throw new TableFailure('invalid-json', i)
      for (let k = i; k < end + 2; k++) if (input[k] !== '\r' && input[k] !== '\n') chars[k] = ' '
      notices.add('comments'); i = end + 1
    }
  }
  const source = chars.join('')
  quoted = false; escaped = false
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!
    if (quoted) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') quoted = false
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      let next = i + 1, previous = i - 1
      while (next < source.length && whitespace(source[next]!)) next++
      while (previous >= 0 && whitespace(source[previous]!)) previous--
      if ((source[next] === ']' || source[next] === '}') && previous >= 0 && !'[{:,'.includes(source[previous]!)) {
        chars[i] = ' '; notices.add('trailing-comma')
      }
    }
  }
  return chars.join('')
}

function selectValue(value: JsonValue, pointer: string): JsonValue {
  if (!pointer) return value
  const fail = (): never => { throw new TableFailure('record-path') }
  if (pointer.length > 1000 || !pointer.startsWith('/')) return fail()
  for (const part of pointer.slice(1).split('/')) {
    if (/~(?:[^01]|$)/.test(part)) return fail()
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~')
    if (value instanceof Map && value.has(key)) value = value.get(key)!
    else if (Array.isArray(value) && /^(0|[1-9]\d*)$/.test(key) && Number.isSafeInteger(Number(key)) && Number(key) < value.length) value = value[Number(key)]!
    else return fail()
  }
  return value
}

export function parseJsonTable(input: string, options: JsonTableOptions, rowLimit: number, columnLimit: number): JsonTableResult {
  try {
    if (!validTableUnicode(input)) throw new TableFailure('unicode')
    const notices = new Set<JsonTableNotice>()
    const source = options.jsonMode === 'strict' ? input : compatibleSource(input, notices)
    const root = new JsonReader(source).read()
    let value: JsonValue
    if (options.recordScope === 'each') {
      if (!Array.isArray(root) || !root.every(item => item instanceof Map)) throw new TableFailure('record-path')
      if (root.length > rowLimit) throw new TableFailure('row-limit')
      value = root.map(item => {
        const selected = selectValue(item, options.recordPath ?? '')
        if (!(selected instanceof Map)) throw new TableFailure('record-path')
        return selected
      })
    } else value = selectValue(root, options.recordPath ?? '')
    const cell = (item: JsonValue): string => {
      if (typeof item === 'string') return item
      if ((item instanceof Map || Array.isArray(item)) && !options.flattenObjects) notices.add('nested-values')
      return encodeJson(item)
    }
    const done = (table: string[][], records: number, header: boolean, format: JsonTableFormat): ParsedTable => ({ status: 'success', table, records, header, format, notices: [...notices] })
    const fail = (code: JsonTableError): never => { throw new TableFailure(code) }
    if (Array.isArray(value) && value.length > rowLimit) return fail('row-limit')
    if (value instanceof Map || (Array.isArray(value) && value.length && value.every(item => item instanceof Map))) {
      let objects = value instanceof Map ? [value] : value as Map<string, JsonValue>[]
      if (options.flattenObjects) {
        const segment = (key: string) => key.replace(/\\/g, '\\\\').replace(/\./g, '\\.')
        objects = objects.map(object => {
          const flattened = new Map<string, JsonValue>()
          const visit = (current: Map<string, JsonValue>, prefix: string[]) => {
            for (const [key, item] of current) {
              const path = [...prefix, segment(key)]
              if (item instanceof Map && item.size) visit(item, path)
              else {
                flattened.set(path.join('.'), item)
                if (flattened.size > columnLimit) throw new TableFailure('column-limit')
              }
            }
          }
          visit(object, [])
          return flattened
        })
        notices.add('flattened-objects')
      }
      const keys: string[] = [], seen = new Set<string>(), normalized = new Set<string>()
      for (const object of objects) for (const key of object.keys()) if (!seen.has(key)) {
        const name = key.replace(/\r\n?/g, '\n')
        if (normalized.has(name)) return fail('header-collision')
        seen.add(key); normalized.add(name); keys.push(key)
        if (keys.length > columnLimit) return fail('column-limit')
      }
      if (!keys.length) return fail('no-columns')
      const rows = objects.map(object => keys.map(key => {
        if (!object.has(key)) { notices.add('missing-cells'); return '' }
        return cell(object.get(key)!)
      }))
      return done([keys, ...rows], objects.length, true, value instanceof Map ? 'object' : 'objects')
    }
    if (Array.isArray(value) && value.every(Array.isArray)) {
      if (!value.length) return done([], 0, false, 'matrix')
      const rows = value as JsonValue[][]
      const columns = Math.max(...rows.map(row => row.length))
      if (!columns) return fail('no-columns')
      if (columns > columnLimit) return fail('column-limit')
      const table = rows.map(row => Array.from({ length: columns }, (_, i) => {
        if (i >= row.length) { notices.add('missing-cells'); return '' }
        return cell(row[i]!)
      }))
      return done(table, rows.length, false, 'matrix')
    }
    if (Array.isArray(value)) {
      if (value.some(item => item instanceof Map || Array.isArray(item))) notices.add('mixed-array')
      return done([['value'], ...value.map(item => [cell(item)])], value.length, true, 'values')
    }
    return done([['value'], [cell(value)]], 1, true, 'value')
  } catch (failure) {
    if (!(failure instanceof TableFailure) && !(failure instanceof JsonFailure)) throw failure
    if (failure.offset === undefined) return { status: 'error', code: failure.code }
    const lines = input.slice(0, failure.offset).split(/\r\n|\r|\n/)
    return { status: 'error', code: failure.code, line: lines.length, column: lines.at(-1)!.length + 1 }
  }
}
