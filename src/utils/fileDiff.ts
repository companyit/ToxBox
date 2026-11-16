import { diffLabels, type DiffResult, type DiffRow } from './textDiff'
export const FILE_DIFF_INPUT = 500000
export const FILE_DIFF_LINES = 5000
export const FILE_DIFF_PAGE = 200
export const FILE_DIFF_REPORT = 2000000
export const fileDiffErrors = {
  input: '每侧文本最多 500,000 个 UTF-16 码元，请缩短后重试。',
  lines: '每侧最多 5,000 行（含末尾空行），请减少行数后重试。',
  report: '完整报告超过 2,000,000 个 UTF-16 码元，无法生成；仍可分页查看对比结果。',
  failed: '对比失败，请减少内容后重试。',
} as const
export type FileDiffCode = keyof typeof fileDiffErrors
export class FileDiffError extends Error { constructor(readonly code: FileDiffCode) { super(code) } }
export function fileDiffLines(input: string): string[] {
  if (input.length > FILE_DIFF_INPUT) throw new FileDiffError('input')
  const lines = input === '' ? [] : input.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > FILE_DIFF_LINES) throw new FileDiffError('lines')
  return lines
}
/** Exact historical tie-breaking, with rolling lengths and one decision bit per pair. */
export function compareFiles(before: string, after: string): DiffResult {
  const left = fileDiffLines(before), right = fileDiffLines(after)
  const n = left.length, m = right.length
  if (left.length === right.length && left.every((line, i) => line === right[i])) {
    return { rows: left.map((text,i) => ({ kind:'same', text, oldLine:i+1, newLine:i+1 })), added:0, removed:0, unchanged:n }
  }
  const ids = new Map<string, number>()
  const intern = (line: string) => { let id = ids.get(line); if (id === undefined) { id = ids.size; ids.set(line,id) }; return id }
  const a = Uint32Array.from(left,intern), b = Uint32Array.from(right,intern)
  const decisions = new Uint8Array(Math.ceil(n * m / 8))
  let next = new Uint16Array(m+1), current = new Uint16Array(m+1)
  for (let i=n-1; i>=0; i--) {
    current[m] = 0
    for (let j=m-1; j>=0; j--) {
      if (a[i] === b[j]) current[j] = next[j+1]! + 1
      else if (next[j]! >= current[j+1]!) {
        current[j] = next[j]!
        const index = i*m+j
        decisions[index >>> 3] = decisions[index >>> 3]! | (1 << (index & 7))
      } else current[j] = current[j+1]!
    }
    const old = next; next = current; current = old
  }
  const rows: DiffRow[] = []
  let i=0, j=0, added=0, removed=0, unchanged=0
  while (i<n || j<m) {
    if (i<n && j<m && a[i] === b[j]) {
      rows.push({kind:'same',text:left[i]!,oldLine:++i,newLine:++j});unchanged++
    } else if (i<n && (j===m || (decisions[(i*m+j) >>> 3]! & (1 << ((i*m+j)&7))))) {
      rows.push({kind:'remove',text:left[i]!,oldLine:++i,newLine:null});removed++
    } else {
      rows.push({kind:'add',text:right[j]!,oldLine:null,newLine:++j});added++
    }
  }
  return {rows,added,removed,unchanged}
}
export function fileDiffReport(result: DiffResult, changesOnly: boolean, limit = FILE_DIFF_REPORT): string {
  const parts = [`逐行对比报告（${changesOnly?'仅变化':'全部'}；不是 Git 补丁）\n新增 ${result.added} 行，删除 ${result.removed} 行，保留 ${result.unchanged} 行。\n类型\t原行\t新行\t内容\n`]
  let length = parts[0]!.length, count = 0
  if (length > limit) throw new FileDiffError('report')
  for (const row of result.rows) {
    if (changesOnly && row.kind === 'same') continue
    const text = `${count++ ? '\n' : ''}${row.kind==='add'?'+':row.kind==='remove'?'-':'='} ${diffLabels[row.kind]}\t${row.oldLine??'—'}\t${row.newLine??'—'}\t${row.text}`
    length += text.length
    if (length > limit) throw new FileDiffError('report')
    parts.push(text)
  }
  return parts.join('')
}
