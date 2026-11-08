import { PDFDocument, degrees } from 'pdf-lib'
import { loadPdf } from './pdfMerge'
import { initialOrganizerPlan, validateOrganizerPlan, validateOrganizerFile, ORGANIZER_LIMITS, type OrganizerPage } from './pdfOrganizerPlan'
export async function inspectOrganizerPdf(file: File) {
  validateOrganizerFile(file)
  const doc = await loadPdf(await file.arrayBuffer())
  initialOrganizerPlan(doc.getPageCount())
  return doc.getPages().map(page => {
    const media = page.getMediaBox(), crop = page.getCropBox()
    const view = [Math.max(media.x, crop.x), Math.max(media.y, crop.y), Math.min(media.x + media.width, crop.x + crop.width), Math.min(media.y + media.height, crop.y + crop.height)]
    const rotation = ((page.getRotation().angle % 360) + 360) % 360
    if (!view.every(Number.isFinite) || view[2]! <= view[0]! || view[3]! <= view[1]! || ![0, 90, 180, 270].includes(rotation)) throw Error('页面尺寸或旋转无效。')
    return { view, rotation }
  })
}
export async function exportOrganizerPdf(file: File, plan: readonly OrganizerPage[]) {
  validateOrganizerFile(file)
  const source = await loadPdf(await file.arrayBuffer())
  validateOrganizerPlan(plan, source.getPageCount())
  const output = await PDFDocument.create()
  const copied = await output.copyPages(source, plan.map(p => p.sourceIndex))
  copied.forEach((page, i) => {
    page.setRotation(degrees(((page.getRotation().angle + plan[i]!.rotationDelta) % 360 + 360) % 360))
    output.addPage(page)
  })
  const bytes = Uint8Array.from(await output.save())
  if (bytes.byteLength > ORGANIZER_LIMITS.outputBytes) throw Error('整理结果超过 100 MiB。')
  return bytes
}
