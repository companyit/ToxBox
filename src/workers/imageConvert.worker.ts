import JSZip from 'jszip'
import { validateConvertFiles, validateConvertOptions, inspectConvertImage, checkConvertPixels, fitImage, ImageConvertError, type ImageConvertOptions } from '../utils/imageConvert'
for (const method of ['log','warn','error','info','debug'] as const) console[method]=()=>{}
self.onmessage=async(event:MessageEvent<{files:File[];options:ImageConvertOptions}>)=>{
 try {
  const {files,options}=event.data;validateConvertFiles(files);validateConvertOptions(options)
  if(typeof createImageBitmap!=='function'||typeof OffscreenCanvas==='undefined')throw new ImageConvertError('capability')
  const zip=new JSZip(),results: {name:string;blob:Blob;width:number;height:number;originalBytes:number}[]=[]
  let pixels=0,total=0
  for(const [index,file] of files.entries()){
   const bytes=new Uint8Array(await file.arrayBuffer()),info=inspectConvertImage(bytes,file.name)
   checkConvertPixels(info.width,info.height,pixels);pixels+=info.width*info.height
   const bitmap=await createImageBitmap(new Blob([bytes],{type:info.type}),{imageOrientation:'from-image'})
   try {
    checkConvertPixels(bitmap.width,bitmap.height)
    const {width,height}=fitImage(bitmap.width,bitmap.height,options.maxSide)
    const canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d')
    if(!ctx)throw new ImageConvertError('capability')
    if(options.format==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height)}
    ctx.drawImage(bitmap,0,0,width,height)
    const mime=`image/${options.format}`,blob=await canvas.convertToBlob({type:mime,quality:options.quality/100})
    if(blob.type!==mime)throw new ImageConvertError('capability')
    total+=blob.size;if(total>100*1024**2)throw new ImageConvertError('output')
    const name=`image-${String(index+1).padStart(2,'0')}.${options.format==='jpeg'?'jpg':options.format}`
    zip.file(name,await blob.arrayBuffer());results.push({name,blob,width,height,originalBytes:file.size})
    self.postMessage({progress:index+1,total:files.length})
   } finally {bitmap.close()}
  }
  const archive=await zip.generateAsync({type:'uint8array',compression:'STORE'})
  if(archive.byteLength>100*1024**2)throw new ImageConvertError('output')
  self.postMessage({ok:true,results,archive})
 }catch(error){self.postMessage({ok:false,code:error instanceof ImageConvertError?error.code:'failed'})}
}
