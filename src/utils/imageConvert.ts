import { inspectImage } from './imagePdf'
export type ImageFormat = 'jpeg' | 'png' | 'webp'
export interface ImageConvertOptions { format: ImageFormat; quality: number; maxSide: number }
export const convertErrors = {
  files: '请选择 1～10 张静态 JPG、PNG 或 WebP 图片。',
  size: '每张图片须非空且不超过 10 MiB，总计最多 50 MiB。',
  pixels: '单边最多 10000 像素，每张最多 2000 万、合计最多 6000 万像素。',
  format: '图片损坏或格式不受支持，请使用静态 JPG、普通 8 位非隔行 PNG 或 WebP；不支持动画与 CMYK JPEG。',
  options: '请填写 10～100 的整数质量和 1～10000 的整数最长边。',
  capability: '当前浏览器不支持所选格式的本地图片转换，请尝试更新浏览器或更换输出格式。',
  failed: '处理失败，请减少图片或检查图片是否损坏后重试。',
  output: '结果总计超过 100 MiB，请减少图片或缩小尺寸。',
} as const
export type ConvertCode = keyof typeof convertErrors
export class ImageConvertError extends Error { constructor(public readonly code: ConvertCode) { super(code) } }
export function validateConvertFiles(files: readonly Pick<File,'name'|'size'>[]) {
  if (!files.length || files.length > 10 || files.some(f=>! /\.(?:jpe?g|png|webp)$/i.test(f.name))) throw new ImageConvertError('files')
  if (files.some(f=>f.size<=0 || f.size>10*1024**2) || files.reduce((n,f)=>n+f.size,0)>50*1024**2) throw new ImageConvertError('size')
}
export function validateConvertOptions(options: ImageConvertOptions) {
  if (!['jpeg','png','webp'].includes(options.format) || !Number.isInteger(options.quality) || options.quality<10 || options.quality>100 || !Number.isInteger(options.maxSide) || options.maxSide<1 || options.maxSide>10000) throw new ImageConvertError('options')
}
export function checkConvertPixels(width:number,height:number,total=0) {
  if (![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=10000) || width*height>20_000_000 || total+width*height>60_000_000) throw new ImageConvertError('pixels')
}
export function fitImage(width:number,height:number,maxSide:number) {
  checkConvertPixels(width,height)
  if(!Number.isInteger(maxSide)||maxSide<1||maxSide>10000) throw new ImageConvertError('options')
  const scale=Math.min(1,maxSide/Math.max(width,height))
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}
}
export function inspectConvertImage(bytes:Uint8Array,name:string) {
  if (!/\.webp$/i.test(name)) {
    try { const info=inspectImage(bytes,name);return {width:info.width,height:info.height,type:info.type} }
    catch (error) { throw new ImageConvertError((error as {code:string}).code==='pixels'?'pixels':'format') }
  }
  const invalid=():never=>{throw new ImageConvertError('format')}
  const text=(at:number,len:number)=>String.fromCharCode(...bytes.subarray(at,at+len))
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  if(bytes.length<20||text(0,4)!=='RIFF'||text(8,4)!=='WEBP'||view.getUint32(4,true)+8!==bytes.length) return invalid()
  let at=12,width=0,height=0,image=false
  const u24=(i:number)=>bytes[i]!+bytes[i+1]!*256+bytes[i+2]!*65536
  while(at+8<=bytes.length){
    const type=text(at,4),size=view.getUint32(at+4,true),data=at+8,end=data+size
    if(end>bytes.length||['ANIM','ANMF'].includes(type))return invalid()
    if(type==='VP8X'){
      if(at!==12||size!==10||(bytes[data]!&2))return invalid()
      width=u24(data+4)+1;height=u24(data+7)+1;checkConvertPixels(width,height)
    }
    if(type==='VP8 '||type==='VP8L'){
      if(image)return invalid();image=true
      let w:number,h:number
      if(type==='VP8 '){if(size<10||text(data+3,3)!=='\x9d\x01\x2a')return invalid();w=view.getUint16(data+6,true)&0x3fff;h=view.getUint16(data+8,true)&0x3fff}
      else {if(size<5||bytes[data]!==0x2f)return invalid();const bits=view.getUint32(data+1,true);if(bits>>>29)return invalid();w=(bits&0x3fff)+1;h=((bits>>>14)&0x3fff)+1}
      if(width&&(w!==width||h!==height))return invalid();width=w;height=h;checkConvertPixels(width,height)
    }
    at=end+(size%2)
  }
  if(at!==bytes.length||!image||!width||!height)return invalid()
  return {width,height,type:'image/webp'}
}
