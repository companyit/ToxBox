import { expect, test } from 'vitest'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import { processPdfs } from '../../src/utils/pdfMerge'
import { validatePdfFiles, PDF_LIMITS } from '../../src/utils/pdfLimits'
import { inspectDocx } from '../../src/utils/docxValidation'
import { DOCX_LIMITS } from '../../src/utils/docxLimits'
const types='<Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
const main='<document>sample</document>'
function archive() {
 const zip=new JSZip()
 zip.file('[Content_Types].xml',types,{createFolders:false});zip.file('word/document.xml',main,{createFolders:false})
 return zip
}
test('PDF 500 页与 10 文件/50 MiB 边界接收，相邻超限拒绝',async()=>{
 const doc=await PDFDocument.create()
 for(let i=0;i<250;i++)doc.addPage([100,100])
 const file=new File([Uint8Array.from(await doc.save()).buffer],'sample.pdf')
 expect((await processPdfs([file,file],true)).counts).toEqual([250,250])
 const files=[{name:'a.pdf',size:20*1024**2},{name:'b.pdf',size:20*1024**2},{name:'c.pdf',size:10*1024**2-7},...Array.from({length:7},()=>({name:'d.pdf',size:1}))]
 expect(files.reduce((sum,f)=>sum+f.size,0)).toBe(PDF_LIMITS.totalBytes)
 expect(()=>validatePdfFiles(files)).not.toThrow()
 files[2]!.size++;expect(()=>validatePdfFiles(files)).toThrow()
})
test('DOCX 1000 原始条目接收，1001 拒绝',async()=>{
 const zip=archive()
 for(let i=2;i<1000;i++)zip.file(`data/${i}.txt`,'',{createFolders:false})
 await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer'}))).resolves.toBeDefined()
 zip.file('data/extra.txt','',{createFolders:false})
 await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer'}))).rejects.toThrow()
},15000)
test('DOCX 实际总解压 50 MiB 接收，多一字节拒绝',async()=>{
 const zip=archive(),size=DOCX_LIMITS.expanded-types.length-main.length
 zip.file('data.bin',new Uint8Array(size),{createFolders:false})
 await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}))).resolves.toBeDefined()
 zip.file('extra.bin',new Uint8Array(1),{createFolders:false})
 await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}))).rejects.toThrow(/限额/)
},20000)
test('DOCX XML 保护拒绝 DTD、实体、加密标志和伪主文档类型',async()=>{
 for(const value of ['<!DOCTYPE document><document/>','<!ENTITY x "sample"><document/>']) {
  const zip=archive();zip.file('word/document.xml',value)
  await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer'}))).rejects.toThrow()
 }
 const zip=archive();zip.file('[Content_Types].xml',types.replace('wordprocessingml.document.main+xml','wordprocessingml.template.main+xml'))
 await expect(inspectDocx(await zip.generateAsync({type:'arraybuffer'}))).rejects.toThrow()
 const buffer=await archive().generateAsync({type:'arraybuffer'}),view=new DataView(buffer)
 for(let i=0;i<buffer.byteLength-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint16(i+8,view.getUint16(i+8,true)|1,true);break}
 await expect(inspectDocx(buffer)).rejects.toThrow()
})
