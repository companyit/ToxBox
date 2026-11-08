import { expect, test } from 'vitest'
import { inspectImage, imagePlacement } from '../../src/utils/imagePdf'
import { ImagePdfError, IMAGE_PDF_LIMITS as L, validateImageFiles, validateImagePixels } from '../../src/utils/imagePdfLimits'
import { updateCrc32, finishCrc32 } from '../../src/utils/crc32'
function png(width=80,height=40,extra='') {
 const chunk=(name:string,data:Uint8Array)=>{const b=new Uint8Array(data.length+12),v=new DataView(b.buffer);v.setUint32(0,data.length);b.set(new TextEncoder().encode(name),4);b.set(data,8);v.setUint32(b.length-4,finishCrc32(updateCrc32(0xffffffff,b.subarray(4,b.length-4))));return b}
 const h=new Uint8Array(13),v=new DataView(h.buffer);v.setUint32(0,width);v.setUint32(4,height);h[8]=8;h[9]=6
 const chunks=[chunk('IHDR',h),...(extra?[chunk(extra,new Uint8Array())]:[]),chunk('IDAT',new Uint8Array([1])),chunk('IEND',new Uint8Array())]
 return new Uint8Array([137,80,78,71,13,10,26,10,...chunks.flatMap(b=>Array.from(b))])
}
function jpeg(orientation=1) {
 const exif=[69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0]
 return new Uint8Array([255,216,255,225,0,exif.length+2,...exif,255,192,0,17,8,0,40,0,80,3,1,17,0,2,17,0,3,17,0,255,218,0,2,0,255,217])
}
test('文件数量/体积等值和相邻超限，不信 MIME',()=>{
 const f=(size:number,name='x.jpg')=>({size,name})
 expect(()=>validateImageFiles(Array.from({length:20},()=>f(1)))).not.toThrow()
 for(const files of [[],Array.from({length:21},()=>f(1)),[f(1,'x.svg')]])expect(()=>validateImageFiles(files)).toThrow(ImagePdfError)
 expect(()=>validateImageFiles(Array.from({length:5},()=>f(L.fileBytes)))).not.toThrow()
 for(const files of [[f(0)],[f(L.fileBytes+1)],[...Array.from({length:5},()=>f(L.fileBytes)),f(1)]])expect(()=>validateImageFiles(files)).toThrow('size')
})
test('像素边界及累计限额解码前拒绝',()=>{
 expect(()=>validateImagePixels(10000,2000,60_000_000)).not.toThrow()
 for(const args of [[10001,1],[0,1],[10000,2001],[10000,2000,60_000_001],[1.5,1]])expect(()=>validateImagePixels(args[0]!,args[1]!,args[2])).toThrow('pixels')
 expect(()=>inspectImage(png(10001,1),'x.png')).toThrow('pixels')
})
test('PNG 签名、CRC、截断、重复头和动画/方向限制',()=>{
 expect(inspectImage(png(),'x.PNG')).toMatchObject({width:80,height:40,type:'image/png'})
 const corrupt=png();corrupt[29]=corrupt[29]! ^ 1
 for(const bytes of [corrupt,png().slice(0,-1),png(80,40,'acTL'),png(80,40,'eXIf'),png(80,40,'IHDR'),new Uint8Array(80)])expect(()=>inspectImage(bytes,'x.png')).toThrow('format')
 expect(()=>inspectImage(png(),'x.jpg')).toThrow('format')
})
test('JPEG 尺寸、EXIF 1～8 及畸形段拒绝',()=>{
 for(let o=1;o<=8;o++)expect(inspectImage(jpeg(o),'x.jpeg')).toMatchObject({width:80,height:40,orientation:o})
 expect(()=>inspectImage(jpeg(9),'x.jpg')).toThrow('format')
 const bad=jpeg();bad[4]=255;bad[5]=255
 for(const b of [bad,jpeg().slice(0,-2),png()])expect(()=>inspectImage(b,'x.jpg')).toThrow('format')
})
test('六种 A4 几何以独立毫米预期对照，保持比例及居中',()=>{
 for(const direction of ['portrait','landscape'] as const)for(const margin of [0,12,20] as const){
  const p=imagePlacement(80,40,{direction,margin}),w=direction==='portrait'?210:297,h=direction==='portrait'?297:210
  expect(p.pageWidth*25.4/72).toBeCloseTo(w);expect(p.pageHeight*25.4/72).toBeCloseTo(h)
  expect(p.width/p.height).toBeCloseTo(2);expect(p.x*2+p.width).toBeCloseTo(p.pageWidth);expect(p.y*2+p.height).toBeCloseTo(p.pageHeight)
  const widthMm=Math.min(w-2*margin,(h-2*margin)*2)
  expect(p.width*25.4/72).toBeCloseTo(widthMm);expect(p.height*25.4/72).toBeCloseTo(widthMm/2)
 }
 expect(()=>imagePlacement(80,40,{direction:'portrait',margin:1} as never)).toThrow('options')
})
test('缺少 Worker 图像能力时明确拒绝，不调用远端或宽松降级',async()=>{
 const { processImages }=await import('../../src/utils/imagePdf')
 const { vi }=await import('vitest')
 vi.stubGlobal('createImageBitmap',undefined)
 try { await expect(processImages([new File(['x'],'test.jpg')])).rejects.toThrow('capability') }finally{vi.unstubAllGlobals()}
})
