import {test,expect} from 'vitest'
import {inspectImage as pure} from '../../src/utils/imageInspect'
import {inspectImage as legacy} from '../../src/utils/imagePdf'
import {validateImageResourceBudgets,imageResourceBudgets,type ImageResourceMetrics} from '../../scripts/image-resource-budget.mjs'
test('旧imagePdf导出仍使用同一个校验函数，保留格式错误语义',()=>{
 expect(legacy).toBe(pure)
 for(const bytes of [new Uint8Array(),new Uint8Array([137,80,78,71]),new Uint8Array([255,216,255,217])]){
  expect(()=>pure(bytes,'synthetic.png')).toThrow('format');expect(()=>legacy(bytes,'synthetic.png')).toThrow('format')
 }
})
test('资源预算拒绝体积超限、非数值和PDF库混入，边界可通过',()=>{
 const group=(bytes:number)=>({files:[],bytes,gzipBytes:0})
 const metrics:ImageResourceMetrics={shared:group(imageResourceBudgets.shared),cropWorker:group(imageResourceBudgets.cropWorker),convertWorker:group(imageResourceBudgets.convertWorker),pdfModules:[]}
 expect(()=>validateImageResourceBudgets(metrics)).not.toThrow()
 for(const key of ['shared','cropWorker','convertWorker'] as const)for(const value of [imageResourceBudgets[key]+1,NaN,0,-1])expect(()=>validateImageResourceBudgets({...metrics,[key]:group(value)})).toThrow()
 expect(()=>validateImageResourceBudgets({...metrics,pdfModules:['node_modules/pdf-lib/es/api/PDFDocument.js']})).toThrow('PDF')
})
