export type DiffKind = 'same' | 'remove' | 'add'
export interface DiffRow { kind: DiffKind; text: string; oldLine: number | null; newLine: number | null }
export interface DiffResult { rows: DiffRow[]; added: number; removed: number; unchanged: number }
export type DiffCode = 'input' | 'lines' | 'failed'
export const diffErrors:Record<DiffCode,string> = {
 input: '每侧最多 100,000 个 UTF-16 码元，请缩短后重试。',
 lines: '每侧最多 1,000 行（含末尾空行），请减少行数后重试。',
 failed: '对比失败，请减少内容后重试。',
}
export class TextDiffError extends Error { constructor(public readonly code:DiffCode){super(code)} }
export function diffLines(input:string) {
 if(input.length>100000)throw new TextDiffError('input')
 const lines=input===''?[]:input.replace(/\r\n?/g,'\n').split('\n')
 if(lines.length>1000)throw new TextDiffError('lines')
 return lines
}
export function compareText(before:string,after:string):DiffResult {
 const left=diffLines(before),right=diffLines(after),width=right.length+1
 const lengths=new Uint16Array((left.length+1)*width)
 for(let i=left.length-1;i>=0;i--)for(let j=right.length-1;j>=0;j--){
  lengths[i*width+j]=left[i]===right[j]?1+lengths[(i+1)*width+j+1]!:Math.max(lengths[(i+1)*width+j]!,lengths[i*width+j+1]!)
 }
 const rows:DiffRow[]=[]
 let i=0,j=0,added=0,removed=0,unchanged=0
 while(i<left.length||j<right.length){
  if(i<left.length&&j<right.length&&left[i]===right[j]){
   rows.push({kind:'same',text:left[i]!,oldLine:i+1,newLine:j+1});i++;j++;unchanged++
  }else if(i<left.length&&(j===right.length||lengths[(i+1)*width+j]!>=lengths[i*width+j+1]!)){
   rows.push({kind:'remove',text:left[i]!,oldLine:i+1,newLine:null});i++;removed++
  }else {rows.push({kind:'add',text:right[j]!,oldLine:null,newLine:j+1});j++;added++}
 }
 return {rows,added,removed,unchanged}
}
export const diffLabels:Record<DiffKind,string>={same:'保留',remove:'删除',add:'新增'}
export function diffReport(result:DiffResult,changesOnly:boolean) {
 const header=`逐行对比报告（${changesOnly?'仅变化':'全部'}；不是 Git 补丁）\n新增 ${result.added} 行，删除 ${result.removed} 行，保留 ${result.unchanged} 行。\n类型\t原行\t新行\t内容\n`
 return header+result.rows.filter(row=>!changesOnly||row.kind!=='same').map(row=>`${row.kind==='add'?'+':row.kind==='remove'?'-':'='} ${diffLabels[row.kind]}\t${row.oldLine??'—'}\t${row.newLine??'—'}\t${row.text}`).join('\n')
}
