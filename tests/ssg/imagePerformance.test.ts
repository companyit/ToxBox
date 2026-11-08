import {test,expect} from 'vitest'
import {collectImageResourceSizes,validateImageResourceBudgets} from '../../scripts/image-resource-budget.mjs'
test('实际图片共享JS和Worker预算通过，不混入PDF生成库',async()=>{
 const metrics=await collectImageResourceSizes()
 expect(()=>validateImageResourceBudgets(metrics)).not.toThrow()
 expect(metrics.pdfModules).toHaveLength(0)
})
