import { decodeFileText, validateTextFile, FileTextError } from '../utils/fileText'
self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const file = event.data.file
    validateTextFile(file.name, file.size)
    const result = decodeFileText(new Uint8Array(await file.arrayBuffer()))
    self.postMessage({ ok: true, ...result })
  } catch (failure) {
    self.postMessage({ ok: false, code: failure instanceof FileTextError ? failure.code : 'failed' })
  }
}
