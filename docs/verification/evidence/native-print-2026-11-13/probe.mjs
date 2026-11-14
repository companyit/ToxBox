import { firefox } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
const dir = await fs.mkdtemp(path.resolve('.ci/native-print-041/probe-'))
const output = path.join(dir, 'native.pdf')
const preferences = {
 'print.always_print_silent': true,
 'print_printer': 'Mozilla Save to PDF',
 'print.print_to_file': true,
 'print.print_to_filename': output,
 'print.printer_Mozilla_Save_to_PDF.print_to_file': true,
 'print.printer_Mozilla_Save_to_PDF.print_to_filename': output,
}
let browser
const record = { output, preferences }
const deadline = setTimeout(() => { console.error('原生打印探测超时'); process.exit(1) }, 25000)
try {
 browser = await firefox.launch({firefoxUserPrefs: preferences, timeout: 10000})
 record.version = browser.version()
 const context = await browser.newContext()
 await context.route('**/*', route => route.abort('blockedbyclient'))
 const page = await context.newPage()
 await page.setContent('<h1>合成打印验证</h1><p>PRINT_041_SYNTHETIC</p><div style="break-before:page">第二页</div>')
 await page.evaluate(() => { window.print() })
 for (let i=0;i<100;i++) {
  try {
   const bytes = await fs.readFile(output)
   const pdf = await PDFDocument.load(bytes)
   if (pdf.getPageCount() !== 2) throw new Error('页数不符')
   record.bytes = bytes.length; record.pages = pdf.getPageCount(); record.ok = true
   break
  } catch { await new Promise(resolve => setTimeout(resolve, 100)) }
 }
 if (!record.ok) throw new Error('没有得到完整两页 PDF')
} catch (error) { record.error = error.message; process.exitCode = 1 }
finally {
 await browser?.close()
 clearTimeout(deadline)
 await fs.writeFile(path.join(dir,'probe.json'),JSON.stringify(record,null,2)+'\n')
 console.log(JSON.stringify(record))
}
