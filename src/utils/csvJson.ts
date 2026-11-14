import { parseJsonTable, validTableUnicode, type JsonTableError, type JsonTableFormat, type JsonTableNotice, type JsonTableOptions } from './jsonTable'

export type TableDirection = 'csv-to-json' | 'json-to-csv'
export type TableError = 'input-limit' | 'output-limit' | 'invalid-csv' | 'shape' | JsonTableError
export type TableResult = { status: 'empty' } | { status: 'error'; code: TableError; line?: number; column?: number } | { status: 'success'; output: string; rows: number; columns: number; format?: JsonTableFormat; notices?: JsonTableNotice[] }
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
  'invalid-json': 'JSON 语法无效，请检查双引号、冒号、逗号与括号。兼容模式支持 BOM、注释和尾随逗号，但不猜测单引号、裸键或缺失值。',
  depth: 'JSON 容器嵌套最多 30 层，请减少嵌套后重试。',
  nodes: 'JSON 最多 50,000 个节点（含对象键），请减少内容后重试。',
  'duplicate-key': '同一个对象存在重复字段名，请明确保留哪个值后重试；不会静默覆盖。',
  'record-path': '记录路径无效或不存在，请使用 /data 或 /data/items 等路径；留空转换根数据，路径最多 1,000 个码元。',
  'no-columns': '数据中没有可输出的列，请提供含字段的对象或至少一列的数组。空表格可使用 []。',
  'header-collision': '字段名在换行规范化后重复，请调整字段名；不会合并或覆盖字段。',
  shape: 'CSV 各行需要列数一致、每行至少一列，请检查表格结构。',
  unicode: '内容包含空字符或孤立代理项，请移除后重试。',
}
const error = (code: TableError): TableResult => ({ status: 'error', code })
const normalize = (text: string) => text.replace(/\r\n?/g, '\n')
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
function serializeRows(value: unknown, direction: TableDirection, rowLimit: number): TableResult {
  if (!Array.isArray(value)) return error('shape')
  if (value.length > rowLimit) return error('row-limit')
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
      if (!validTableUnicode(cell)) return error('unicode')
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

export function serializeTable(value: unknown, direction: TableDirection): TableResult {
  return serializeRows(value, direction, TABLE_ROW_LIMIT)
}

export function convertTable(input: string, direction: TableDirection, options: JsonTableOptions = {}): TableResult {
  if (input.length > TABLE_INPUT_LIMIT) return error('input-limit')
  if (direction === 'csv-to-json') {
    const source = input.startsWith('\uFEFF') ? input.slice(1) : input
    if (!source) return { status: 'empty' }
    if (!validTableUnicode(source)) return error('unicode')
    const parsed = parseCsv(normalize(source))
    return typeof parsed === 'string' ? error(parsed) : serializeTable(parsed, direction)
  }
  if (!input) return { status: 'empty' }
  const parsed = parseJsonTable(input, options, TABLE_ROW_LIMIT, TABLE_COLUMN_LIMIT)
  if (parsed.status === 'error') return parsed
  const result = serializeRows(parsed.table, direction, TABLE_ROW_LIMIT + (parsed.header ? 1 : 0))
  if (result.status !== 'success') return result
  return { ...result, rows: parsed.records, ...(parsed.records ? { format: parsed.format } : {}), ...(parsed.notices.length ? { notices: parsed.notices } : {}) }
}
