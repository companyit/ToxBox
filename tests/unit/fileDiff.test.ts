import { expect, test } from 'vitest'
import { compareFiles, fileDiffLines, fileDiffReport } from '../../src/utils/fileDiff'
import { compareText, diffReport } from '../../src/utils/textDiff'
test('位回溯逐项等于旧算法，包括重复行删除优先与双方行号',()=>{
 const sets:string[][]=[[]]
 for(let n=1;n<=4;n++)for(let mask=0;mask<2**n;mask++)sets.push(Array.from({length:n},(_,i)=>mask&(1<<i)?'甲':'乙'))
 for(const a of sets)for(const b of sets)expect(compareFiles(a.join('\n'),b.join('\n'))).toEqual(compareText(a.join('\n'),b.join('\n')))
 let seed=19
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed}
 for(let n=0;n<150;n++){
  const a=Array.from({length:random()%30},()=>String(random()%5)).join('\n'), b=Array.from({length:random()%30},()=>String(random()%5)).join('\n')
  expect(compareFiles(a,b)).toEqual(compareText(a,b))
 }
})
test('5000行最大合法长文本和完全不同结果可重建，统计全局正确',()=>{
 const a=Array.from({length:5000},(_,i)=>'a'.repeat(94)+String(i).padStart(5,'0')).join('\n')+'a'
 const b=Array.from({length:5000},(_,i)=>'b'.repeat(94)+String(i).padStart(5,'0')).join('\n')+'b'
 expect(a).toHaveLength(500000)
 const result=compareFiles(a,b)
 expect(result).toMatchObject({added:5000,removed:5000,unchanged:0})
 expect(result.rows).toHaveLength(10000)
 expect(result.rows.filter(x=>x.kind!=='add').map(x=>x.text).join('\n')).toBe(a)
 expect(result.rows.filter(x=>x.kind!=='remove').map(x=>x.text).join('\n')).toBe(b)
 expect(compareFiles(a,a)).toMatchObject({added:0,removed:0,unchanged:5000})
})
test('文件专用边界及空行语义，031限制保持',()=>{
 expect(fileDiffLines('\n'.repeat(4999))).toHaveLength(5000)
 expect(()=>fileDiffLines('\n'.repeat(5000))).toThrow('lines')
 expect(()=>fileDiffLines('x'.repeat(500001))).toThrow('input')
 expect(()=>compareText('x'.repeat(100001),'')).toThrow('input')
 expect(compareFiles('','\n')).toEqual(compareText('','\n'))
 expect(compareFiles('a\r\nb\r','a\nb\n')).toEqual(compareText('a\r\nb\r','a\nb\n'))
})
test('完整报告与旧格式一致、遵循筛选，精确预算且超限不影响结果',()=>{
 const result=compareFiles('甲\n旧','甲\n新')
 for(const only of [false,true]){
  const expected=diffReport(result,only)
  expect(fileDiffReport(result,only)).toBe(expected)
  expect(fileDiffReport(result,only,expected.length)).toBe(expected)
  expect(()=>fileDiffReport(result,only,expected.length-1)).toThrow('report')
 }
 expect(result).toEqual(compareText('甲\n旧','甲\n新'))
})
