import { getDocument, PDFWorker, AnnotationMode, type PDFDocumentLoadingTask, type RenderTask } from 'pdfjs-dist'
const picker = document.querySelector<HTMLInputElement>('#file')!
const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const status = document.querySelector<HTMLElement>('#status')!
let loading: PDFDocumentLoadingTask | undefined, renderTask: RenderTask | undefined
let port: Worker | undefined, worker: PDFWorker | undefined, revision = 0, rotation = 0
const setStatus = (text: string) => { status.textContent = text }
function destroy() {
  revision++; renderTask?.cancel(); renderTask = undefined
  // Destroy promise is handled; caller-owned native worker is terminated immediately.
  void loading?.destroy().catch(() => {}); loading = undefined
  worker?.destroy(); worker = undefined; port?.terminate(); port = undefined
  canvas.width = canvas.height = 0
  delete canvas.dataset.ready
}
async function render() {
  const file = picker.files?.[0]; destroy()
  if (!file || !/\.pdf$/i.test(file.name) || !file.size || file.size > 20 * 1024 ** 2) { setStatus('请选择20 MiB以内的非空PDF'); return }
  const version = revision
  setStatus('正在渲染')
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    if (version !== revision) return
    port = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker = PDFWorker.create({ port, verbosity: 0 })
    loading = getDocument({ data, worker, verbosity: 0, stopAtErrors: true,
      useWorkerFetch: true, useSystemFonts: false, disableWorkerRendering: true,
      cMapUrl: new URL('./pdf-assets/cmaps/', location.href).href,
      standardFontDataUrl: new URL('./pdf-assets/standard_fonts/', location.href).href,
      wasmUrl: new URL('./pdf-assets/wasm/', location.href).href,
      iccUrl: new URL('./pdf-assets/iccs/', location.href).href,
      maxImageSize: 16_000_000, canvasMaxAreaInBytes: 16 * 1024 ** 2,
    })
    timer = setTimeout(() => { if (version === revision) { destroy(); setStatus('渲染超时，已释放') } }, 10_000)
    const doc = await loading.promise
    if (version !== revision) return
    if (doc.numPages < 1 || doc.numPages > 100) throw Error('pages')
    const page = await doc.getPage(1)
    if (version !== revision) return
    const base = page.getViewport({ scale: 1, rotation: (page.rotate + rotation) % 360 })
    if (![base.width, base.height].every(n => Number.isFinite(n) && n > 0)) throw Error('geometry')
    const viewport = page.getViewport({ scale: 320 / Math.max(base.width, base.height), rotation: (page.rotate + rotation) % 360 })
    canvas.width = Math.max(1, Math.round(viewport.width)); canvas.height = Math.max(1, Math.round(viewport.height))
    renderTask = page.render({ canvas, viewport, annotationMode: AnnotationMode.DISABLE })
    await renderTask.promise
    if (version !== revision) return
    canvas.dataset.ready = 'true'; canvas.dataset.pages = String(doc.numPages)
    setStatus(`渲染完成：${doc.numPages}页，${canvas.width}×${canvas.height}`)
  } catch {
    if (version === revision) { destroy(); setStatus('缩略图不可用，请检查文件后重试') }
  } finally { clearTimeout(timer) }
}
picker.onchange = () => { rotation = 0; destroy(); setStatus('文件已选择，请主动渲染') }
document.querySelector<HTMLButtonElement>('#render')!.onclick = () => { void render() }
document.querySelector<HTMLButtonElement>('#rotate')!.onclick = () => { rotation = (rotation + 90) % 360; void render() }
document.querySelector<HTMLButtonElement>('#cancel')!.onclick = () => { destroy(); setStatus('已取消并释放') }
window.addEventListener('pagehide', () => { destroy(); picker.value = '' })
