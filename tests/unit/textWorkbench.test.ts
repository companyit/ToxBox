import {test,expect} from 'vitest'
import {processWorkflow,workflowPreset,workflowReport,WorkflowError,type TextStep} from '../../src/utils/textWorkbench'
const operation=(operation:TextStep['operation']):TextStep=>({operation,find:'',replacement:''})
test('名单预设串联清理去重排序，每步数量与最终差异一致',()=>{
 const value=processWorkflow(' b \na\n b \n\n a ',workflowPreset('list'))
 expect(value.output).toBe('a\nb')
 expect(value.original).toEqual({characters:14,lines:5});expect(value.final).toEqual({characters:3,lines:2})
 expect(value.stages.map(stage=>[stage.characters,stage.lines])).toEqual([[8,5],[7,4],[3,2],[3,2]])
 expect(value.stages.every(stage=>stage.changed)).toBe(true)
 expect(value.diff).toMatchObject({added:1,removed:4,unchanged:1})
})
test('文案预设普通替换，报告不包含原文与查找替换参数',()=>{
 const steps=workflowPreset('copy');steps[2]!.find='PRIVATE_OLD';steps[2]!.replacement='PRIVATE_NEW'
 const value=processWorkflow('  PRIVATE_OLD  \n\nPRIVATE_OLD服务',steps)
 expect(value.output).toBe('PRIVATE_NEW\nPRIVATE_NEW服务')
 const report=workflowReport(value);expect(report).toContain('普通文本替换');expect(report).not.toContain('PRIVATE_OLD');expect(report).not.toContain('PRIVATE_NEW')
})
test('自定义顺序与重复步骤按实际顺序执行，不修改调用方输入配置',()=>{
 const request=[operation('trim'),operation('dedupe')]
 expect(processWorkflow(' a \na',request).output).toBe('a')
 expect(processWorkflow(' a \na',[operation('dedupe'),operation('trim')]).output).toBe('a\na')
 expect(request).toEqual([operation('trim'),operation('dedupe')])
 expect(processWorkflow('aa',[{operation:'replace',find:'a',replacement:'b'},{operation:'replace',find:'b',replacement:'c'}]).output).toBe('cc')
})
test('规范化统计、空结果继续后续步骤且先验证全部参数',()=>{
 expect(processWorkflow('😀\r\n甲',[operation('trim')]).original).toEqual({characters:3,lines:2})
 const value=processWorkflow(' \n',[operation('remove-empty'),operation('dedupe'),operation('ascending')])
 expect(value.output).toBe('');expect(value.final).toEqual({characters:0,lines:0});expect(value.stages).toHaveLength(3)
 expect(()=>processWorkflow('',[{operation:'replace',find:'',replacement:''}])).toThrow('parameters')
})
test('任意一步失败原子拒绝：输入、中间输出和参数/步骤限制',()=>{
 expect(()=>processWorkflow('x'.repeat(100001),[operation('trim')])).toThrow('size')
 expect(()=>processWorkflow('\n'.repeat(1000),[operation('trim')])).toThrow('lines')
 for(const steps of [[],Array.from({length:9},()=>operation('trim'))])expect(()=>processWorkflow('a',steps)).toThrow('steps')
 const steps=[operation('trim'),{operation:'replace' as const,find:'a',replacement:'x'.repeat(1000)}]
 try{processWorkflow('a'.repeat(101),steps);throw new Error('应拒绝中间超限')}catch(error){expect(error).toBeInstanceOf(WorkflowError);expect(error).toMatchObject({code:'size',step:2})}
 try{processWorkflow('a',[operation('trim'),{operation:'replace',find:'a',replacement:'\n'.repeat(1000)}]);throw new Error('应拒绝行数超限')}catch(error){expect(error).toMatchObject({code:'lines',step:2})}
 expect(()=>processWorkflow('a',[{operation:'replace',find:'a',replacement:'x'.repeat(1001)}])).toThrow('parameters')
})
