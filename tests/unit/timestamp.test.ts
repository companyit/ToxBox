import { test, expect } from 'vitest'
import { convertTimestamp as convert, type TimestampOptions } from '../../src/utils/timestamp'
const base: TimestampOptions = {direction:'to-date',unit:'seconds',offset:0}
test('时间戳单位、固定偏移及负数', () => {
 expect(convert('0',base)).toBe('1970-01-01 00:00:00.000')
 expect(convert('1',base)).toBe(convert('1000',{...base,unit:'milliseconds'}))
 expect(convert('0',{...base,offset:8})).toBe('1970-01-01 08:00:00.000')
 expect(convert('1969-12-31 23:59:59.999',{...base,direction:'to-timestamp'})).toBe('-1')
})
test('严格日期校验和早期年份往返', () => {
 for(const value of ['0001-01-01 00:00:00.000','0099-02-28 12:34:56.789','2000-02-29 00:00:00.000','9999-12-31 23:59:59.999']) {
  const ms=convert(value,{...base,direction:'to-timestamp',unit:'milliseconds'})
  expect(convert(ms,{...base,unit:'milliseconds'})).toBe(value)
 }
 for(const value of ['1900-02-29 00:00:00.000','2024-04-31 00:00:00.000','2024-01-01 24:00:00.000','0000-01-01 00:00:00.000']) expect(()=>convert(value,{...base,direction:'to-timestamp'})).toThrow()
 for(const value of ['1e3','1.5','9007199254740992','1'.repeat(65)]) expect(()=>convert(value,base)).toThrow()
 expect(()=>convert('0001-01-01 00:00:00.000',{...base,direction:'to-timestamp',offset:8})).toThrow()
})
