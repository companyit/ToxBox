import {test,expect} from 'vitest'
import {compareText,diffLines,diffReport} from '../../src/utils/textDiff'
test('新增删除替换及确定性重复行，双方行号正确',()=>{
 const value=compareText('甲\n旧\n尾','甲\n新\n尾')
 expect(value).toEqual({added:1,removed:1,unchanged:2,rows:[
  {kind:'same',text:'甲',oldLine:1,newLine:1},{kind:'remove',text:'旧',oldLine:2,newLine:null},{kind:'add',text:'新',oldLine:null,newLine:2},{kind:'same',text:'尾',oldLine:3,newLine:3},
 ]})
 expect(compareText('A\nB','B\nA').rows.map(row=>row.kind)).toEqual(['remove','same','add'])
 expect(compareText('A\nA','A').rows.map(row=>row.kind)).toEqual(['same','remove'])
})
test('空字符串、末尾空行、换行规范化和空白差异',()=>{
 expect(compareText('','')).toEqual({rows:[],added:0,removed:0,unchanged:0})
 expect(compareText('','\n')).toMatchObject({added:2,removed:0,unchanged:0})
 expect(compareText('a','a\n')).toMatchObject({added:1,removed:0,unchanged:1})
 expect(compareText('a\r\nb\r','a\nb\n')).toMatchObject({added:0,removed:0,unchanged:3})
 expect(compareText(' a\t','a')).toMatchObject({added:1,removed:1,unchanged:0})
})
test('输入和行数不截断，边界有效',()=>{
 expect(()=>diffLines('a'.repeat(100000))).not.toThrow()
 expect(()=>diffLines('a'.repeat(100001))).toThrow('input')
 expect(diffLines('\n'.repeat(999))).toHaveLength(1000)
 expect(()=>diffLines('\n'.repeat(1000))).toThrow('lines')
 expect(compareText(Array(1000).fill('a').join('\n'),Array(1000).fill('a').join('\n')).unchanged).toBe(1000)
})
test('报告遵循筛选，不改动原结果',()=>{
 const result=compareText('保留\n旧','保留\n新')
 expect(diffReport(result,false)).toContain('= 保留\t1\t1\t保留')
 expect(diffReport(result,true)).not.toContain('= 保留\t')
 expect(diffReport(result,true)).toContain('- 删除\t2\t—\t旧')
 expect(diffReport(result,true)).toContain('+ 新增\t—\t2\t新')
 expect(result.rows).toHaveLength(3)
})
test('小规模穷举与独立最短编辑距离核对，并重建双方原文本',()=>{
 const sets:string[][]=[[]]
 for(let len=1;len<=4;len++)for(let mask=0;mask<2**len;mask++)sets.push(Array.from({length:len},(_,i)=>(mask&(1<<i))?'甲':'乙'))
 function distance(a:string[],b:string[]):number{
  if(!a.length)return b.length;if(!b.length)return a.length
  if(a[0]===b[0])return distance(a.slice(1),b.slice(1))
  return 1+Math.min(distance(a.slice(1),b),distance(a,b.slice(1)))
 }
 for(const left of sets)for(const right of sets){
  const result=compareText(left.join('\n'),right.join('\n'))
  expect(result.rows.filter(r=>r.kind!=='add').map(r=>r.text)).toEqual(left)
  expect(result.rows.filter(r=>r.kind!=='remove').map(r=>r.text)).toEqual(right)
  expect(result.added+result.removed).toBe(distance(left,right))
  expect(result.rows.filter(r=>r.oldLine!==null).map(r=>r.oldLine)).toEqual(left.map((_,i)=>i+1))
  expect(result.rows.filter(r=>r.newLine!==null).map(r=>r.newLine)).toEqual(right.map((_,i)=>i+1))
 }
})
