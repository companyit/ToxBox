export type TableDirection = 'csv-to-json' | 'json-to-csv'
export type TableError = 'input-limit' | 'row-limit' | 'column-limit' | 'output-limit' | 'invalid-csv' | 'invalid-json' | 'depth' | 'shape' | 'unicode'
export type TableResult = { status: 'empty' } | { status: 'error'; code: TableError } | { status: 'success'; output: string; rows: number; columns: number }
export const TABLE_INPUT_LIMIT = 100000
export const TABLE_ROW_LIMIT = 1000
export const TABLE_COLUMN_LIMIT = 100
export const TABLE_OUTPUT_LIMIT = 1000000
export const tableErrors: Record<TableError, string> = {
  'input-limit': '输入超过 100,000 个 UTF-16 码元，请缩短后重试。',
  'row-limit': '表格最多 1,000 条记录，请减少记录后重试。',
  'column-limit': '表格最多 100 列，请减少列数后重试。',
  'output-limit': '结果超过 1,000,000 个 UTF-16 码元，请减少内容后重试。',
  'invalid-csv': 'CSV 引号格式无效，请检查引号是否闭合、转义及闭合后的分隔符。',
  'invalid-json': 'JSON 语法无效，请使用严格 JSON，不含 BOM、注释或尾随逗号。',
  depth: 'JSON 容器嵌套最多两层，请使用二维字符串数组。',
  shape: '请使用各行列数一致、每行至少一列的二维字符串表格，不支持对象或非字符串字段。',
  unicode: '内容包含空字符或孤立代理项，请移除后重试。',
}
const error = (code: TableError): TableResult => ({ status: 'error', code })
const normalize = (text: string) => text.replace(/\r\n?/g, '\n')
function validUnicode(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 0) return false
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(++i)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false
    } else if (code >= 0xdc00 && code <= 0xdfff) return false
  }
  return true
}
function tooDeep(text: string): boolean {
  let quoted = false, escaped = false, depth = 0
  for (const ch of text) {
    if (quoted) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') quoted = false
    } else if (ch === '"') quoted = true
    else if (ch === '[' || ch === '{') { if (++depth > 2) return true }
    else if (ch === ']' || ch === '}') depth--
  }
  return false
}
function parseCsv(text: string): string[][] | TableError {
  const rows: string[][] = []
  let row: string[] = [], field = '', state: 'start' | 'plain' | 'quoted' | 'closed' = 'start'
  function endField(): TableError | undefined {
    if (row.length >= TABLE_COLUMN_LIMIT) return 'column-limit'
    row.push(field); field = ''; state = 'start'
  }
  function endRow(): TableError | undefined {
    const failure = endField()
    if (failure) return failure
    if (rows.length >= TABLE_ROW_LIMIT) return 'row-limit'
    if (rows.length && row.length !== rows[0]!.length) return 'shape'
    rows.push(row); row = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (state === 'quoted') {
      if (ch === '"') state = 'closed'
      else field += ch
    } else if (state === 'closed' && ch === '"') {
      field += '"'; state = 'quoted'
    } else if (ch === ',') {
      const failure = endField(); if (failure) return failure
    } else if (ch === '\n') {
      const failure = endRow(); if (failure) return failure
    } else if (state === 'closed') return 'invalid-csv'
    else if (ch === '"') {
      if (state !== 'start') return 'invalid-csv'
      state = 'quoted'
    } else { field += ch; state = 'plain' }
  }
  if (state === 'quoted') return 'invalid-csv'
  if (!text.endsWith('\n') || state !== 'start' || row.length) {
    const failure = endRow(); if (failure) return failure
  }
  return rows
}

// Exact length of JSON.stringify(string), without allocating escaped output.
function jsonStringLength(text: string): number {
  let size = 2
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    size += code === 34 || code === 92 || [8, 9, 10, 12, 13].includes(code) ? 2 : code < 32 ? 6 : 1
  }
  return size
}

/** Serializes a validated, normalized rectangle; also guards independently supplied tables. */
export function serializeTable(value: unknown, direction: TableDirection): TableResult {
  if (!Array.isArray(value)) return error('shape')
  if (value.length > TABLE_ROW_LIMIT) return error('row-limit')
  const table: string[][] = []
  let columns = 0
  let size = direction === 'csv-to-json' ? (value.length ? 4 + 2 * (value.length - 1) : 2) : Math.max(0, value.length - 1)
  for (const row of value) {
    if (!Array.isArray(row) || !row.length) return error('shape')
    if (row.length > TABLE_COLUMN_LIMIT) return error('column-limit')
    if (table.length && columns !== row.length) return error('shape')
    columns = row.length
    size += direction === 'csv-to-json' ? 8 + 2 * (columns - 1) : columns - 1
    const normalized: string[] = []
    for (const cell of row) {
      if (typeof cell !== 'string') return error('shape')
      if (!validUnicode(cell)) return error('unicode')
      const text = normalize(cell)
      normalized.push(text)
      if (direction === 'csv-to-json') size += 4 + jsonStringLength(text)
      else {
        size += 2 + text.length
        for (const ch of text) if (ch === '"') size++
      }
      if (size > TABLE_OUTPUT_LIMIT) return error('output-limit')
    }
    table.push(normalized)
  }
  const output = direction === 'csv-to-json'
    ? JSON.stringify(table, null, 2)
    : table.map(row => row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(',')).join('\n')
  if (output.length > TABLE_OUTPUT_LIMIT || output.length !== size) return error('output-limit')
  return { status: 'success', output, rows: table.length, columns }
}

export function convertTable(input: string, direction: TableDirection): TableResult {
  if (input.length > TABLE_INPUT_LIMIT) return error('input-limit')
  if (direction === 'csv-to-json') {
    const source = input.startsWith('\uFEFF') ? input.slice(1) : input
    if (!source) return { status: 'empty' }
    if (!validUnicode(source)) return error('unicode')
    const parsed = parseCsv(normalize(source))
    return typeof parsed === 'string' ? error(parsed) : serializeTable(parsed, direction)
  }
  if (!input) return { status: 'empty' }
  if (tooDeep(input)) return error('depth')
  let parsed: unknown
  try { parsed = JSON.parse(input) } catch { return error('invalid-json') }
  return serializeTable(parsed, direction)
}
