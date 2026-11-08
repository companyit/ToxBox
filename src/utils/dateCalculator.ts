export type DateRequest = { mode: 'difference'; start: string; end: string } | { mode: 'offset'; base: string; days: string }
export const dateErrors = {
  missing: '请补齐当前模式的日期及天数参数。',
  date: '日期须为 YYYY-MM-DD，且是 0001～9999 年的真实公历日期；不接受空白或超过 10 个字符。',
  days: '天数须为无前导零的整数，不接受正号、-0 或空白；最多 8 个字符，绝对值不超过 3652058。',
  range: '计算结果超出 0001-01-01～9999-12-31 范围。',
} as const
export type DateResult = { status: 'empty' } | { status: 'error'; code: keyof typeof dateErrors } | { status: 'success'; output: string }
const leap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
const months = (y: number) => [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function yearStart(y: number) { const n = y - 1; return 365 * n + Math.floor(n / 4) - Math.floor(n / 100) + Math.floor(n / 400) }
function ordinal(input: string): number | undefined {
  if (input.length !== 10 || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input)) return
  const y = Number(input.slice(0, 4)), m = Number(input.slice(5, 7)), d = Number(input.slice(8))
  const lengths = months(y)
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > lengths[m - 1]!) return
  return yearStart(y) + lengths.slice(0, m - 1).reduce((a, b) => a + b, 0) + d - 1
}
function fromOrdinal(n: number): string {
  let lo = 1, hi = 9999
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (yearStart(mid) <= n) lo = mid; else hi = mid - 1 }
  let remaining = n - yearStart(lo), month = 1
  for (const length of months(lo)) { if (remaining < length) break; remaining -= length; month++ }
  return `${String(lo).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(remaining + 1).padStart(2, '0')}`
}
export function calculateDate(request: DateRequest): DateResult {
  const values = request.mode === 'difference' ? [request.start, request.end] : [request.base, request.days]
  if (values.every(v => v === '')) return { status: 'empty' }
  if (values.some(v => v === '')) return { status: 'error', code: 'missing' }
  const first = ordinal(values[0]!)
  if (first === undefined) return { status: 'error', code: 'date' }
  if (request.mode === 'difference') {
    const end = ordinal(request.end)
    return end === undefined ? { status: 'error', code: 'date' } : { status: 'success', output: `${end - first} 天` }
  }
  if (request.days.length > 8 || !/^(?:0|-?[1-9][0-9]*)$/.test(request.days) || Math.abs(Number(request.days)) > 3652058) return { status: 'error', code: 'days' }
  const target = first + Number(request.days)
  return target < 0 || target > 3652058 ? { status: 'error', code: 'range' } : { status: 'success', output: fromOrdinal(target) }
}
