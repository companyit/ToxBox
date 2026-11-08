import { test, expect } from 'vitest'
import { validateCropRect, fitCropRatio, quantizeCrop, cropOutput, dragCrop, imagePoint, validateCropOptions, type CropRatio, type Corner } from '../../src/utils/imageCrop'
const image = { width: 400, height: 300 }, whole = { x: 0, y: 0, ...image }
test('整数比例与主尺寸规则、拒绝非法和超界草稿', () => {
 const wide = fitCropRatio(whole, image, '16:9')
 expect(wide).toEqual({ x: 0, y: 37, width: 400, height: 225 })
 expect(cropOutput(wide, 'width', 200)).toEqual({ width: 200, height: 113 })
 expect(quantizeCrop({x:0,y:0,width:201,height:100},image,'16:9','width')).toEqual({x:0,y:0,width:192,height:108})
 expect(()=>quantizeCrop({x:300,y:200,width:201,height:100},image,'16:9','width')).toThrow()
 expect(()=>fitCropRatio({x:0,y:0,width:1,height:1},{width:1,height:1},'16:9')).toThrow('ratio')
 for(const r of [{...whole,x:-1},{...whole,width:0},{...whole,width:1.5},{...whole,x:1},{...whole,y:NaN}])expect(()=>validateCropRect(r,image)).toThrow()
 for(const size of [0,401,NaN,1.5])expect(()=>cropOutput(whole,'width',size)).toThrow('size')
 expect(cropOutput({x:0,y:0,width:100,height:1},'width',1)).toEqual({width:1,height:1})
 expect(()=>validateCropOptions({rect:whole,ratio:'free',axis:'width',size:100,format:'png',quality:101},image)).toThrow('options')
})
test('预览坐标不受DPR影响、移动限制与固定对角',()=>{
 expect(imagePoint(125,100,{left:25,top:25,width:200,height:150},image)).toEqual({x:200,y:150})
 const r={x:100,y:50,width:200,height:100}
 expect(dragCrop(r,image,'free','move',500,-500)).toEqual({x:200,y:0,width:200,height:100})
 expect(dragCrop(r,image,'free','nw',500,500)).toEqual({x:299,y:149,width:1,height:1})
 expect(dragCrop(r,image,'free','se',-500,-500)).toEqual({x:100,y:50,width:1,height:1})
})
test('小尺寸遍历：四角与移动始终位于图内，固定比例整数倍且对角不变',()=>{
 for(const width of [1,4,17,33])for(const height of [1,5,19,40])for(const ratio of ['free','1:1','4:3','16:9'] as CropRatio[]){
  const size={width,height},full={x:0,y:0,...size}
  let start;try{start=fitCropRatio(full,size,ratio)}catch{continue}
  for(const corner of ['nw','ne','sw','se','move'] as const)for(const dx of [-100,-1,0,1,100])for(const dy of [-100,0,100]){
   const result=dragCrop(start,size,ratio,corner,dx,dy)
   expect(()=>validateCropRect(result,size,ratio)).not.toThrow()
   if(corner!=='move'){
    const c=corner as Corner
    expect(c.includes('w')?result.x+result.width:result.x).toBe(c.includes('w')?start.x+start.width:start.x)
    expect(c.includes('n')?result.y+result.height:result.y).toBe(c.includes('n')?start.y+start.height:start.y)
   }
  }
 }
})
