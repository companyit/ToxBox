import { expect, test } from 'vitest'
import { generateCron, previewCron } from '../../src/utils/cronPreview'

test('starts strictly after the supplied minute and skips the weekend', () => {
  const times = previewCron('0 9 * * 1-5', '2026-11-20 09:00')
  expect(times).toHaveLength(10)
  expect(times.slice(0, 2)).toEqual(['2026-11-23 09:00', '2026-11-24 09:00'])
})

test('handles lists, overlapping values and positive range and wildcard steps', () => {
  expect(previewCron('0,0-30/15,*/30 9 * * *', '2026-11-21 08:59').slice(0, 4)).toEqual([
    '2026-11-21 09:00', '2026-11-21 09:15', '2026-11-21 09:30', '2026-11-22 09:00',
  ])
})

test('combines restricted date and weekday with OR, and wildcard steps with AND', () => {
  expect(previewCron('0 9 1 * 0,7', '2026-11-28 00:00').slice(0, 3)).toEqual([
    '2026-11-29 09:00', '2026-12-01 09:00', '2026-12-06 09:00',
  ])
  expect(previewCron('0 9 */2 * 1', '2026-11-01 00:00').slice(0, 2)).toEqual([
    '2026-11-09 09:00', '2026-11-23 09:00',
  ])
})

test('honors Gregorian year boundaries and empty or partial searches', () => {
  expect(previewCron('0 0 29 2 *', '2024-02-29 00:00')).toEqual(['2028-02-29 00:00', '2032-02-29 00:00'])
  expect(previewCron('0 0 29 2 *', '2096-02-29 00:00')).toEqual(['2104-02-29 00:00'])
  expect(previewCron('0 0 31 2 *', '2026-01-01 00:00')).toEqual([])
  expect(previewCron('* * * * *', '9999-12-31 23:58')).toEqual(['9999-12-31 23:59'])
})

test('rejects unsupported syntax, limits, and invalid dates', () => {
  const start = '2026-11-21 00:00'
  for (const expression of ['', '* * * *', '* * * * * command', '@daily', '* * *\n* *']) {
    expect(() => previewCron(expression, start)).toThrow(/五个字段/)
  }
  for (const expression of ['60 * * * *', '15/2 * * * *', '12-3 * * * *', '*/0 * * * *']) {
    expect(() => previewCron(expression, start)).toThrow(/分钟字段/)
  }
  expect(() => previewCron('0 9 *,1 * 1', start)).toThrow(/日期字段/)
  expect(() => previewCron('0 9 * * MON', start)).toThrow(/星期字段/)
  expect(() => previewCron(' '.repeat(257), start)).toThrow(/256/)
  expect(() => previewCron('* * * * *', '2026-02-29 00:00')).toThrow()
  expect(() => previewCron('* * * * *', '2026-01-01 00:00:00')).toThrow(/起算时间/)
})

test('generates each supported preset and validates relevant fields', () => {
  expect(generateCron('daily', '05:07', [], '')).toBe('7 5 * * *')
  expect(generateCron('weekdays', '09:00', [], '')).toBe('0 9 * * 1-5')
  expect(generateCron('weekly', '23:59', [6, 0, 6], '')).toBe('59 23 * * 0,6')
  expect(generateCron('minute-step', '', [], '1')).toBe('* * * * *')
  const step = generateCron('minute-step', '', [], '17')
  expect(step).toBe('*/17 * * * *')
  expect(previewCron(step, '2026-11-21 09:51').slice(0, 2)).toEqual([
    '2026-11-21 10:00', '2026-11-21 10:17',
  ])
  expect(() => generateCron('daily', '24:00', [], '')).toThrow(/小时和分钟/)
  expect(() => generateCron('weekly', '09:00', [], '')).toThrow(/星期/)
  for (const bad of ['0', '60', '2.5', '1\n', '']) {
    expect(() => generateCron('minute-step', '', [], bad)).toThrow(/分钟步长/)
  }
})
