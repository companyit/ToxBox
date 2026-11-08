export const PDF_LIMITS = { files: 10, fileBytes: 20 * 1024 ** 2, totalBytes: 50 * 1024 ** 2, pages: 500, outputBytes: 100 * 1024 ** 2 }
export function validatePdfFiles(files: readonly Pick<File, 'name' | 'size'>[]) {
  if (!files.length || files.length > PDF_LIMITS.files) throw Error('请选择 1～10 份 PDF，合并至少需要两份。')
  if (files.some(f => !/\.pdf$/i.test(f.name) || !f.size || f.size > PDF_LIMITS.fileBytes)) throw Error('仅支持非空 PDF，每份最多 20 MiB。')
  if (files.reduce((n, f) => n + f.size, 0) > PDF_LIMITS.totalBytes) throw Error('文件总大小不能超过 50 MiB。')
}
