import { expect, test } from 'vitest'
import { calculateDate } from '../../src/utils/dateCalculator'
const diff = (start: string, end: string) => calculateDate({ mode: 'difference', start, end })
const add = (base: string, days: string) => calculateDate({ mode: 'offset', base, days })
const success = (output: string) => ({ status: 'success', output })
test('独立已知日期、世纪闰年、全跨度与 0～99 年', () => {
  for (const [a,b,n] of [['2024-02-28','2024-03-01',2],['1900-02-28','1900-03-01',1],['2000-02-28','2000-03-01',2],['0001-01-01','9999-12-31',3652058],['0099-12-31','0100-01-01',1],['2023-12-31','2024-01-01',1],['0001-01-01','0401-01-01',146097]] as const) {
    expect(diff(a,b)).toEqual(success(`${n} 天`)); expect(diff(b,a)).toEqual(success(`${-n} 天`))
  }
  expect(diff('2000-02-29','2000-02-29')).toEqual(success('0 天'))
})
test('正负零偏移、跨月年及最小最大日期', () => {
  for (const [a,n,b] of [['2024-02-28','1','2024-02-29'],['2024-02-28','2','2024-03-01'],['2024-03-01','-1','2024-02-29'],['1900-03-01','-1','1900-02-28'],['0001-01-01','3652058','9999-12-31'],['9999-12-31','-3652058','0001-01-01'],['0099-12-31','1','0100-01-01'],['0001-01-01','0','0001-01-01']] as const) expect(add(a,n)).toEqual(success(b))
  for (const [a,n] of [['0001-01-01','-1'],['9999-12-31','1']]) expect(add(a!,n!)).toEqual({status:'error',code:'range'})
})
test('严格日期、不截断、不宽松修正', () => {
  for (const value of ['2024-2-09',' 2024-02-29','2024-02-29 ','0000-01-01','2023-02-29','1900-02-29','2024-04-31','2024-00-01','2024-13-01','2024-01-00','２０２４-01-01','2024-01-01T00:00','x'.repeat(100)]) expect(diff(value,'2024-01-01')).toEqual({status:'error',code:'date'})
})
test('严格整数及缺参、空输入', () => {
  expect(diff('','')).toEqual({status:'empty'}); expect(add('','')).toEqual({status:'empty'})
  expect(diff('2024-01-01','')).toEqual({status:'error',code:'missing'})
  for (const days of ['-0','+1','01','-01','1.0','1e2',' 1','1 ','１','3652059','-3652059','100000000']) expect(add('2024-01-01',days)).toEqual({status:'error',code:'days'})
})
test('400 年周期各月末的独立 UTC 日历对照', () => {
  // 仅测试使用 UTC Date 作独立参照，生产算法不依赖 Date。
  for (let year=1600;year<2000;year++) for(let month=0;month<12;month++) {
    const date=new Date(Date.UTC(year,month+1,0)), next=new Date(date.getTime()+86400000)
    const iso=(d:Date)=>d.toISOString().slice(0,10)
    expect(add(iso(date),'1')).toEqual(success(iso(next)))
  }
})
