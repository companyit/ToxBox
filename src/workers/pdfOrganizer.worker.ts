import type { OrganizerPage } from '../utils/pdfOrganizerPlan'
import { inspectOrganizerPdf, exportOrganizerPdf } from '../utils/pdfOrganizer'
for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) console[method] = () => {}
export type OrganizerRequest = { kind: 'inspect'; file: File } | { kind: 'export'; file: File; plan: OrganizerPage[] }
self.onmessage = async (event: MessageEvent<OrganizerRequest>) => {
  try {
    const request = event.data
    if (request.kind === 'inspect') self.postMessage({ ok: true, kind: 'inspect', geometry: await inspectOrganizerPdf(request.file) })
    else if (request.kind === 'export') {
      const bytes = await exportOrganizerPdf(request.file, request.plan)
      self.postMessage({ ok: true, kind: 'export', bytes }, { transfer: [bytes.buffer] })
    } else throw Error('request')
  } catch { self.postMessage({ ok: false, message: 'PDF 检查或导出失败。仅支持 20 MiB、1～100 页的普通 PDF，不支持损坏、加密或带表单的文件；结果最多 100 MiB。' }) }
}
