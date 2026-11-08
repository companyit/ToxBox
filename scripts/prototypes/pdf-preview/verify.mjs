import { chromium, webkit } from '@playwright/test'
import { PDFDocument, PDFName, PDFString, degrees, rgb } from 'pdf-lib'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const evidence = path.resolve('.ci/pdf-preview/evidence')
await mkdir(evidence, { recursive: true })
const doc = await PDFDocument.create()
for (let i = 0; i < 6; i++) {
  const page = doc.addPage([240, 360])
  page.drawRectangle({ x: 10, y: 10, width: 75, height: 140, color: rgb(1, 0, 0) })
  page.drawText(`Page ${i + 1}`, { x: 30, y: 280, size: 24 })
  if (i === 0) page.setRotation(degrees(90))
}
const link = doc.context.register(doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 240, 360], A: { S: 'URI', URI: PDFString.of('https://invalid.example/never-fetch-document-content') } }))
doc.getPage(0).node.set(PDFName.of('Annots'), doc.context.obj([link]))
const bytes = Buffer.from(await doc.save())
const results = []
for (const [name, launcher] of Object.entries({ chromium, webkit })) {
  const browser = await launcher.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } })
    const requests = [], errors = [], logs = []
    page.on('request', r => requests.push({ url: r.url(), method: r.method() }))
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => logs.push({ type: m.type(), text: m.text() }))
    await page.goto('http://127.0.0.1:4188/')
    await page.locator('#file').setInputFiles({ name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: bytes })
    await page.locator('#render').click()
    await page.locator('canvas[data-ready="true"]').waitFor()
    const original = await page.locator('canvas').evaluate(c => ({ width: c.width, height: c.height, pages: c.dataset.pages, pixels: Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data).filter((v, i) => i % 4 !== 3 && v < 230).length }))
    if (original.width !== 320 || original.height !== 213 || original.pages !== '6' || original.pixels < 1000) throw Error(`${name}: initial dimensions/content`)
    await page.locator('#rotate').click()
    await page.locator('canvas[data-ready="true"]').waitFor()
    const rotated = await page.locator('canvas').evaluate(c => ({ width: c.width, height: c.height }))
    if (rotated.width !== 213 || rotated.height !== 320) throw Error(`${name}: rotation`)
    await page.screenshot({ path: path.join(evidence, `${name}-rotated.png`), fullPage: true })
    // Synthetic scanned Chinese page: generated locally, no remote fixture or user file.
    const png = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 240; c.height = 360
      const ctx = c.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 240, 360)
      ctx.fillStyle = 'black'; ctx.font = '24px sans-serif'; ctx.fillText('本地中文扫描样例', 10, 90)
      ctx.fillStyle = 'blue'; ctx.fillRect(20, 140, 100, 150)
      return c.toDataURL('image/png').split(',')[1]
    })
    const scan = await PDFDocument.create(); const image = await scan.embedPng(Buffer.from(png, 'base64'))
    scan.addPage([240, 360]).drawImage(image, { x: 0, y: 0, width: 240, height: 360 })
    await page.locator('#file').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await scan.save()) })
    await page.locator('#render').click(); await page.locator('canvas[data-ready="true"]').waitFor()
    const scanPixels = await page.locator('canvas').evaluate(c => Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data).filter((v, i) => i % 4 !== 3 && v < 230).length)
    if (scanPixels < 1000) throw Error('scanned image blank')
    await page.screenshot({ path: path.join(evidence, `${name}-scan.png`), fullPage: true })
    await page.locator('#cancel').click()
    if (await page.locator('canvas').evaluate(c => c.width !== 0 || c.height !== 0 || !!c.dataset.ready)) throw Error('release')
    // Start and immediately cancel before parsing/rendering can finish.
    await page.evaluate(() => { document.querySelector('#render').click(); document.querySelector('#cancel').click() })
    await page.waitForTimeout(300)
    if (await page.locator('canvas').getAttribute('data-ready')) throw Error('late render')
    await page.locator('#render').click()
    await page.locator('canvas[data-ready="true"]').waitFor()
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    if (await page.locator('#file').inputValue()) throw Error('pagehide file')
    await page.locator('#file').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-broken') })
    await page.locator('#render').click()
    await page.getByRole('status').filter({ hasText: '缩略图不可用' }).waitFor()
    const external = requests.filter(r => !r.url.startsWith('http://127.0.0.1:4188/'))
    if (!requests.some(r => r.url.includes('/standard_fonts/'))) throw Error('standard font resource not exercised')
    const writes = requests.filter(r => r.method !== 'GET')
    if (external.length || writes.length || errors.length) throw Error(`${name}: network/errors ${JSON.stringify({ external, writes, errors })}`)
    results.push({ name, original, rotated, scanPixels, requests, logs, errors, checks: ['local rendering', 'same-origin standard font resource', 'local Chinese scanned image', 'external link annotation not executed', 'original + incremental rotation', 'nonblank pixels', 'cancel/release', 'late result guard', 'rerender', 'pagehide cleanup', 'malformed PDF', 'same-origin GET only', 'CSP without unsafe-eval'] })
    await page.close()
  } finally { await browser.close() }
}
await writeFile(path.join(evidence, 'results.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results.map(({ name, checks }) => ({ name, checks })), null, 2))
