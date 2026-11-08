import { processPdfs } from '../utils/pdfMerge'
// 解析库可能输出带输入片段的诊断；仅在独立 Worker 内禁用日志。
for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) console[method] = () => {}
self.onmessage = async (event: MessageEvent<{ files: File[]; merge: boolean }>) => {
  try { self.postMessage({ ok: true, ...await processPdfs(event.data.files, event.data.merge) }) }
  catch (error) { self.postMessage({ ok: false, message: error instanceof Error && /^(请选择|仅支持|文件总|文件头|无法读取|不支持|PDF 页数|合并至少|总页数|合并结果)/.test(error.message) ? error.message : 'PDF 处理失败，请减少文件后重试。' }) }
}
