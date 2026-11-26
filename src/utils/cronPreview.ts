import { convertTimestamp } from './timestamp'

const fields = [
  { name: '分钟', min: 0, max: 59 },
  { name: '小时', min: 0, max: 23 },
  { name: '日期', min: 1, max: 31, dayField: true },
  { name: '月份', min: 1, max: 12 },
  { name: '星期', min: 0, max: 7, dayField: true },
] as const

function parseField(source: string, field: typeof fields[number]) {
  const wildcard = source.startsWith('*')
  const parts = source.split(',')
  const values = new Set<number>()
  const invalid = () => new Error(`${field.name}字段无效，请检查格式及 ${field.min}～${field.max} 范围。`)
  if ('dayField' in field && source.includes('*') && parts.length > 1) throw invalid()

  for (const item of parts) {
    const match = /^(\*|\d+)(?:-(\d+))?(?:\/(\d+))?$/.exec(item)
    if (!match) throw invalid()
    const [, first, last, stride] = match
    if ((first === '*' && last) || (stride && first !== '*' && !last)) throw invalid()
    const start = first === '*' ? field.min : Number(first)
    const end = last ? Number(last) : first === '*' ? field.max : start
    const step = stride ? Number(stride) : 1
    if (start < field.min || end > field.max || end < start || !Number.isSafeInteger(step) || step < 1) {
      throw invalid()
    }
    for (let value = start; value <= end; value += step) {
      values.add(field.name === '星期' && value === 7 ? 0 : value)
    }
  }
  return { wildcard, values }
}

export function parseCronStart(input: string): number {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input) || input.length !== 16) {
    throw new Error('起算时间请输入 UTC 日期，格式为 YYYY-MM-DD HH:mm。')
  }
  return Number(convertTimestamp(input, { direction: 'to-timestamp', unit: 'milliseconds', offset: 0 }))
}

export function previewCron(expression: string, startingAt: string): string[] {
  if (expression.length > 256) throw new Error('Cron 表达式最多允许 256 个码元。')
  const tokens = expression.trim().split(/[^\S\r\n]+/)
  if (tokens.length !== fields.length || !expression.trim() || /[\r\n]/.test(expression)) {
    throw new Error('请输入五个字段，依次为分钟、小时、日期、月份、星期。')
  }
  const [minute, hour, date, month, weekday] = fields.map((field, index) => parseField(tokens[index]!, field)) as [
    ReturnType<typeof parseField>, ReturnType<typeof parseField>, ReturnType<typeof parseField>,
    ReturnType<typeof parseField>, ReturnType<typeof parseField>,
  ]

  const start = parseCronStart(startingAt)
  const day = new Date(start)
  const boundary = new Date(start)
  const endingYear = boundary.getUTCFullYear() + 8
  const endingMonth = boundary.getUTCMonth()
  boundary.setUTCFullYear(endingYear)
  if (boundary.getUTCMonth() !== endingMonth) boundary.setUTCDate(0)
  const end = Math.min(boundary.getTime(), Date.UTC(9999, 11, 31, 23, 59))
  day.setUTCHours(0, 0, 0, 0)
  const hours = [...hour.values].sort((a, b) => a - b)
  const minutes = [...minute.values].sort((a, b) => a - b)
  const result: string[] = []
  const mustMatchBothDays = date.wildcard || weekday.wildcard

  for (; day.getTime() <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    if (!month.values.has(day.getUTCMonth() + 1)) continue
    const dateMatches = date.values.has(day.getUTCDate())
    const weekdayMatches = weekday.values.has(day.getUTCDay())
    if (!(mustMatchBothDays ? dateMatches && weekdayMatches : dateMatches || weekdayMatches)) continue

    for (const h of hours) {
      for (const m of minutes) {
        const value = day.getTime() + (h * 60 + m) * 60_000
        if (value > end) return result
        if (value <= start) continue
        result.push(new Date(value).toISOString().slice(0, 16).replace('T', ' '))
        if (result.length === 10) return result
      }
    }
  }
  return result
}

export type CronSchedule = 'daily' | 'weekdays' | 'weekly' | 'minute-step'

export function generateCron(schedule: CronSchedule, time: string, weekdays: readonly number[], interval: string): string {
  if (schedule === 'minute-step') {
    const step = Number(interval)
    if (!interval || interval.length > 2 || /\D/.test(interval) || step < 1 || step > 59) {
      throw new Error('分钟步长请输入 1～59 的整数。')
    }
    return step === 1 ? '* * * * *' : `*/${step} * * * *`
  }

  const parts = /^(\d{2}):(\d{2})$/.exec(time)
  if (!parts || time.length !== 5 || Number(parts[1]) > 23 || Number(parts[2]) > 59) {
    throw new Error('请选择有效的小时和分钟。')
  }

  let days = schedule === 'weekdays' ? '1-5' : '*'
  if (schedule === 'weekly') {
    if (!weekdays.length || weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new Error('请至少选择一个有效的星期。')
    }
    days = [...new Set(weekdays)].sort((a, b) => a - b).join(',')
  }
  return `${Number(parts[2])} ${Number(parts[1])} * * ${days}`
}
