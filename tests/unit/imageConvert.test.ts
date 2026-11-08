import { test,expect } from 'vitest'
import {fitImage,validateConvertFiles,validateConvertOptions,inspectConvertImage,checkConvertPixels} from '../../src/utils/imageConvert'
test('等比缩小、不放大和极窄图片',()=>{
 expect(fitImage(4000,2000,1920)).toEqual({width:1920,height:960})
 expect(fitImage(80,40,1920)).toEqual({width:80,height:40})
 expect(fitImage(1,10000,100)).toEqual({width:1,height:100})
 for(const n of [0,10001,NaN,1.5])expect(()=>fitImage(80,40,n)).toThrow('options')
})
test('文件批次数量、体积及参数边界',()=>{
 expect(()=>validateConvertFiles([{name:'a.webp',size:10*1024**2}])).not.toThrow()
 for(const files of [[],[{name:'a.svg',size:1}],[{name:'a.png',size:0}],Array.from({length:11},()=>({name:'a.jpg',size:1}))])expect(()=>validateConvertFiles(files)).toThrow()
 expect(()=>validateConvertFiles(Array.from({length:6},()=>({name:'a.png',size:10*1024**2})))).toThrow('size')
 expect(()=>checkConvertPixels(10000,10000)).toThrow('pixels')
 expect(()=>checkConvertPixels(5000,4000,40_000_001)).toThrow('pixels')
 expect(()=>validateConvertOptions({format:'png',quality:80,maxSide:1920})).not.toThrow()
 expect(()=>validateConvertOptions({format:'webp',quality:101,maxSide:1920})).toThrow('options')
})
test('WebP头部尺寸、动画标记、截断和伪装格式拒绝',()=>{
 const bytes=new Uint8Array(26),view=new DataView(bytes.buffer)
 for(const [at,value] of [[0,'RIFF'],[8,'WEBP'],[12,'VP8L']] as const)bytes.set([...value].map(c=>c.charCodeAt(0)),at)
 view.setUint32(4,18,true);view.setUint32(16,5,true);bytes[20]=0x2f;view.setUint32(21,(39<<14)|79,true)
 expect(inspectConvertImage(bytes,'a.webp')).toEqual({width:80,height:40,type:'image/webp'})
 expect(()=>inspectConvertImage(bytes.slice(0,25),'a.webp')).toThrow('format')
 bytes.set([65,78,73,77],12);expect(()=>inspectConvertImage(bytes,'a.webp')).toThrow('format')
 expect(()=>inspectConvertImage(bytes,'a.png')).toThrow('format')
})
