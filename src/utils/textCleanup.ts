export type CleanupOperation = 'trim' | 'remove-empty' | 'dedupe' | 'ascending' | 'descending' | 'replace'
export type CleanupRequest = { input: string } & (
  | { operation: Exclude<CleanupOperation, 'replace'> }
  | { operation: 'replace'; find: string; replacement: string }
)
export type CleanupResult = { status: 'success'; output: string } | { status: 'empty' } | { status: 'error'; message: string }
export const CLEANUP_INPUT_LIMIT = 100000
export const CLEANUP_PARAMETER_LIMIT = 1000
export const CLEANUP_OUTPUT_LIMIT = 1000000
const normalize = (text: string) => text.replace(/\r\n?/g, '\n')

export function cleanupText(request: CleanupRequest): CleanupResult {
  if (request.input.length > CLEANUP_INPUT_LIMIT) return { status: 'error', message: '输入超过 100,000 个 UTF-16 码元，请缩短后重试。' }
  if (!request.input) return { status: 'empty' }
  if (request.operation === 'replace') {
    if (request.find.length > CLEANUP_PARAMETER_LIMIT || request.replacement.length > CLEANUP_PARAMETER_LIMIT) return { status: 'error', message: '查找与替换各最多 1,000 个 UTF-16 码元，请缩短后重试。' }
    if (!request.find) return { status: 'error', message: '请输入要查找的普通文本。' }
  }
  const input = normalize(request.input)
  let output: string
  if (request.operation === 'replace') {
    const find = normalize(request.find), replacement = normalize(request.replacement)
    let count = 0, cursor = 0, position: number
    while ((position = input.indexOf(find, cursor)) !== -1) { count++; cursor = position + find.length }
    if (input.length + count * (replacement.length - find.length) > CLEANUP_OUTPUT_LIMIT) return { status: 'error', message: '结果超过 1,000,000 个 UTF-16 码元，请减少替换内容后重试。' }
    // split/join treats dollar signs literally and replaces non-overlapping matches.
    output = input.split(find).join(replacement)
  } else {
    const lines = input.split('\n')
    switch (request.operation) {
      case 'trim': output = lines.map(line => line.trim()).join('\n'); break
      case 'remove-empty': output = lines.filter(line => line.trim() !== '').join('\n'); break
      case 'dedupe': output = [...new Set(lines)].join('\n'); break
      case 'ascending':
      case 'descending': {
        const direction = request.operation === 'ascending' ? 1 : -1
        output = lines.map((line, index) => ({ line, index })).sort((a, b) => a.line === b.line ? a.index - b.index : (a.line < b.line ? -1 : 1) * direction).map(item => item.line).join('\n')
        break
      }
    }
  }
  if (output.length > CLEANUP_OUTPUT_LIMIT) return { status: 'error', message: '结果超过 1,000,000 个 UTF-16 码元，请减少内容后重试。' }
  return { status: 'success', output }
}
