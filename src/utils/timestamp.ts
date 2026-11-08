export type TimestampOptions = { direction: 'to-date' | 'to-timestamp'; unit: 'seconds' | 'milliseconds'; offset: 0 | 8 }
function formatDate(ms: number, offset: number): string {
  const d = new Date(ms + offset * 3600000)
  const year = d.getUTCFullYear()
  if (!Number.isFinite(ms) || !Number.isFinite(d.getTime()) || year < 1 || year > 9999) throw new Error('日期超出 0001～9999 年范围。')
  const pad = (n: number, length = 2) => String(n).padStart(length, '0')
  return `${pad(year,4)}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(),3)}`
}
export function convertTimestamp(input: string, options: TimestampOptions): string {
  if (input.length > 64) throw new Error('输入超过 64 个 UTF-16 码元。')
  if (!input) return ''
  const { direction, unit, offset } = options
  if (direction === 'to-date') {
    if (!/^-?\d+$/.test(input) || !Number.isSafeInteger(Number(input))) throw new Error('请输入安全范围内的十进制整数时间戳。')
    const ms = Number(input) * (unit === 'seconds' ? 1000 : 1)
    if (!Number.isSafeInteger(ms)) throw new Error('时间戳超出安全范围。')
    // 同时约束 UTC 和目标时区年份，确保双向转换范围一致。
    formatDate(ms, 0)
    return formatDate(ms, offset)
  }
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(input)) throw new Error('日期格式应为 YYYY-MM-DD HH:mm:ss.SSS。')
  const [year,month,day,hour,minute,second,millisecond] = input.split(/[- :.]/).map(Number) as [number,number,number,number,number,number,number]
  const d = new Date(0)
  d.setUTCFullYear(year,month-1,day)
  d.setUTCHours(hour,minute,second,millisecond)
  if (formatDate(d.getTime(),0) !== input) throw new Error('日期或时间无效，请检查闰年、天数和时间。')
  const ms = d.getTime() - offset * 3600000
  formatDate(ms,0)
  return String(unit === 'seconds' ? Math.floor(ms/1000) : ms)
}
