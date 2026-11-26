import { validateJsonFile, decodeJsonFile, JsonFileError } from '../utils/jsonFile'
self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const file = event.data.file
    validateJsonFile(file.name, file.size)
    const text = decodeJsonFile(new Uint8Array(await file.arrayBuffer()))
    self.postMessage({ ok: true, text })
  } catch (failure) {
    self.postMessage({ ok: false, code: failure instanceof JsonFileError ? failure.code : 'failed' })
  }
}
