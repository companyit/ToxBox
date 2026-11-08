// Imported dynamically in the browser only; never evaluate PDF.js during SSG.
import { getDocument, PDFWorker, AnnotationMode, OPS, version as pdfjsVersion, type PDFDocumentLoadingTask, type RenderTask, type PDFDocumentProxy } from 'pdfjs-dist'
import type { OrganizerGeometry, OrganizerPage } from './pdfOrganizerPlan'
export interface PdfThumbnail { url: string; width: number; height: number }
export const thumbnailKey = (item: OrganizerPage) => `${item.sourceIndex}:${item.rotationDelta}`
export class PdfPreviewSession {
  private streamFailureVersion = 0
  private invalidPages = new Set<number>()
  private createPort() {
    // PDF.js 6.5.438 may resolve both render and getOperatorList after a stream
    // error. Observe only the pinned protocol's ERROR marker, never its reason.
    if (pdfjsVersion !== '6.5.438') throw Error('Unsupported PDF preview version')
    const port = new Worker(new URL('../workers/pdfPreview.worker.ts', import.meta.url), { type: 'module' })
    port.addEventListener('message', event => {
      const marker = event.data?.stream
      if (marker === 5 || ([7, 8].includes(marker) && event.data?.success === false)) this.streamFailureVersion++
    })
    return port
  }
  private port = this.createPort()
  private worker = PDFWorker.create({ port: this.port, verbosity: 0 })
  private loading?: PDFDocumentLoadingTask
  private doc?: PDFDocumentProxy
  private dead = false
  private wanted: OrganizerPage[] = []
  private active = new Map<string, { task?: RenderTask; cancel: boolean }>()
  readonly cache = new Map<string, PdfThumbnail>()
  readonly failures = new Set<string>()
  constructor(private changed: () => void, private fatal: () => void) {}
  async load(file: File, expected: readonly OrganizerGeometry[]) {
    const data = new Uint8Array(await file.arrayBuffer())
    if (this.dead) throw Error('cancelled')
    const base = new URL('/pdf-assets/', location.origin)
    this.loading = getDocument({ data, worker: this.worker, verbosity: 0, stopAtErrors: true, useSystemFonts: false, disableWorkerRendering: true,
      cMapUrl: new URL('cmaps/', base).href, standardFontDataUrl: new URL('standard_fonts/', base).href,
      wasmUrl: new URL('wasm/', base).href, iccUrl: new URL('iccs/', base).href,
      useWorkerFetch: true, maxImageSize: 16_000_000, canvasMaxAreaInBytes: 16 * 1024 ** 2 })
    const doc = await this.loading.promise
    if (this.dead) throw Error('cancelled')
    if (doc.numPages !== expected.length) throw Error('geometry')
    for (let i = 0; i < expected.length; i++) {
      const page = await doc.getPage(i + 1), geometry = expected[i]!
      if (this.dead || ((page.rotate % 360) + 360) % 360 !== geometry.rotation || page.view.length !== 4 || page.view.some((n: number, j: number) => !Number.isFinite(n) || Math.abs(n - geometry.view[j]!) > .01)) throw Error('geometry')
    }
    this.doc = doc
  }
  setWanted(items: readonly OrganizerPage[]) {
    if (this.dead) return
    this.wanted = items.slice(0, 24).map(p => ({ ...p }))
    const keys = new Set(this.wanted.map(thumbnailKey))
    for (const [key, run] of this.active) if (!keys.has(key)) { run.cancel = true; run.task?.cancel() }
    // Touch visible cache entries before evicting old pages.
    for (const key of keys) { const value = this.cache.get(key); if (value) { this.cache.delete(key); this.cache.set(key, value) } }
    this.pump()
  }
  private pump() {
    if (this.dead || !this.doc) return
    for (const item of this.wanted) {
      const key = thumbnailKey(item)
      if (this.active.size >= 2) break
      if (this.cache.has(key) || this.failures.has(key) || this.active.has(key)) continue
      const run = { cancel: false } as { task?: RenderTask; cancel: boolean }
      this.active.set(key, run)
      void this.render(item, run).finally(() => { this.active.delete(key); this.changed(); this.pump() })
    }
  }
  private async render(item: OrganizerPage, run: { task?: RenderTask; cancel: boolean }) {
    const key = thumbnailKey(item), canvas = document.createElement('canvas'), streamVersion = this.streamFailureVersion
    const timer = setTimeout(() => {
      if (!this.dead) { this.destroy(); this.fatal() }
    }, 10_000)
    try {
      if (this.invalidPages.has(item.sourceIndex)) throw Error('page')
      const page = await this.doc!.getPage(item.sourceIndex + 1)
      if (this.dead || run.cancel) return
      const rotation = ((page.rotate + item.rotationDelta) % 360 + 360) % 360
      const full = page.getViewport({ scale: 1, rotation })
      if (![full.width, full.height].every(n => Number.isFinite(n) && n > 0)) throw Error('geometry')
      const viewport = page.getViewport({ scale: 320 / Math.max(full.width, full.height), rotation })
      canvas.width = Math.max(1, Math.round(viewport.width)); canvas.height = Math.max(1, Math.round(viewport.height))
      // Parse before drawing and independently watch stream failures; neither
      // upstream promise alone reliably distinguishes partial operator lists.
      const operators = await page.getOperatorList({ annotationMode: AnnotationMode.DISABLE })
      if (this.dead || run.cancel) return
      if (streamVersion !== this.streamFailureVersion) throw Error('stream')
      run.task = page.render({ canvas, viewport, annotationMode: AnnotationMode.DISABLE })
      await run.task.promise
      if (this.dead || run.cancel) return
      if (streamVersion !== this.streamFailureVersion) throw Error('stream')
      // Async image decoding errors can resolve to null without rejecting render.
      for (let i = 0; i < operators.fnArray.length; i++) {
        if (![OPS.paintImageXObject, OPS.paintImageXObjectRepeat].includes(operators.fnArray[i]!)) continue
        const id: unknown = operators.argsArray[i]?.[0]
        if (typeof id !== 'string') throw Error('image')
        const objects = id.startsWith('g_') ? page.commonObjs : page.objs
        if (!objects.get(id)) throw Error('image')
      }
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (this.dead || run.cancel) return
      if (!blob) throw Error('image')
      const url = URL.createObjectURL(blob)
      this.cache.set(key, { url, width: canvas.width, height: canvas.height })
      while (this.cache.size > 24) { const oldest = this.cache.keys().next().value!; URL.revokeObjectURL(this.cache.get(oldest)!.url); this.cache.delete(oldest) }
    } catch { if (!this.dead && !run.cancel) { this.failures.add(key); this.invalidPages.add(item.sourceIndex) } }
    finally { clearTimeout(timer); canvas.width = canvas.height = 0 }
  }
  destroy() {
    if (this.dead) return
    this.dead = true
    for (const run of this.active.values()) { run.cancel = true; run.task?.cancel() }
    for (const entry of this.cache.values()) URL.revokeObjectURL(entry.url)
    this.cache.clear(); this.failures.clear(); this.invalidPages.clear(); this.wanted = []
    void this.loading?.destroy().catch(() => {})
    this.doc = undefined; this.worker.destroy(); this.port.terminate(); this.changed()
  }
}
