import {cleanupText,type CleanupOperation} from './textCleanup'
import {analyzeText} from './textStatistics'
import {compareText,diffLines,TextDiffError,type DiffResult} from './textDiff'
export interface TextStep {operation:CleanupOperation;find:string;replacement:string}
export const workbenchOperations:readonly {value:CleanupOperation;label:string}[]=[
 {value:'trim',label:'清理每行首尾空白'},{value:'remove-empty',label:'删除空白行'},{value:'dedupe',label:'按行去重'},
 {value:'ascending',label:'按行升序'},{value:'descending',label:'按行降序'},{value:'replace',label:'普通文本替换'},
]
export function workflowPreset(name:'list'|'copy'):TextStep[]{
 return (name==='list'?['trim','remove-empty','dedupe','ascending']:['trim','remove-empty','replace']).map(operation=>({operation:operation as CleanupOperation,find:operation==='replace'?'旧称':'',replacement:operation==='replace'?'新称':''}))
}
export interface WorkflowCounts {characters:number;lines:number}
export interface WorkflowResult {output:string;original:WorkflowCounts;final:WorkflowCounts;stages:{label:string;characters:number;lines:number;changed:boolean}[];diff:DiffResult}
export const workflowErrors={
 steps:'请选择 1～8 个有效步骤。',parameters:'查找文本不能为空，查找与替换各最多 1,000 个 UTF-16 码元。',
 size:'文本超过 100,000 个 UTF-16 码元，请缩短内容或调整步骤。',lines:'文本超过 1,000 行（含末尾空行），请减少行数或调整步骤。',
 failed:'步骤处理失败，请检查配置后重试。',
} as const
export type WorkflowCode=keyof typeof workflowErrors
export class WorkflowError extends Error{constructor(public readonly code:WorkflowCode,public readonly step?:number){super(code)}}
function counts(text:string,step?:number):WorkflowCounts{
 let lines:number
 try{lines=diffLines(text).length}catch(error){throw new WorkflowError(error instanceof TextDiffError&&error.code==='lines'?'lines':'size',step)}
 const analysis=analyzeText(text)
 if(analysis.status!=='ok')throw new WorkflowError('size',step)
 return {characters:analysis.statistics.characterCount,lines}
}
export function processWorkflow(input:string,steps:readonly TextStep[]):WorkflowResult{
 if(!steps.length||steps.length>8)throw new WorkflowError('steps')
 for(const [index,step]of steps.entries()){
  if(!workbenchOperations.some(item=>item.value===step.operation))throw new WorkflowError('steps',index+1)
  if(step.operation==='replace'&&(typeof step.find!=='string'||!step.find||step.find.length>1000||typeof step.replacement!=='string'||step.replacement.length>1000))throw new WorkflowError('parameters',index+1)
 }
 counts(input)
 const originalText=input.replace(/\r\n?/g,'\n'),original=counts(originalText)
 const stages:WorkflowResult['stages']=[]
 let output=originalText
 for(const [index,step]of steps.entries()){
  const result=cleanupText(step.operation==='replace'?{input:output,operation:'replace',find:step.find,replacement:step.replacement}:{input:output,operation:step.operation})
  if(result.status==='error')throw new WorkflowError('failed',index+1)
  const next=result.status==='empty'?'':result.output
  const statistics=counts(next,index+1)
  stages.push({label:workbenchOperations.find(item=>item.value===step.operation)!.label,...statistics,changed:next!==output});output=next
 }
 return {output,original,final:counts(output),stages,diff:compareText(originalText,output)}
}
export function workflowReport(result:WorkflowResult){
 return `文本处理流程报告（统计基于 LF 规范化文本）\n原文：${result.original.characters} 字符，${result.original.lines} 行\n`+
 result.stages.map((stage,index)=>`${index+1}. ${stage.label}：${stage.characters} 字符，${stage.lines} 行（${stage.changed?'有变化':'无变化'}）`).join('\n')+
 `\n最终：${result.final.characters} 字符，${result.final.lines} 行\n逐行对比：新增 ${result.diff.added} 行，删除 ${result.diff.removed} 行，保留 ${result.diff.unchanged} 行。\n报告不含原文及替换参数。`
}
