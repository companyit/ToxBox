import { compareFiles, FileDiffError } from '../utils/fileDiff'
self.onmessage = (event: MessageEvent<{before: string; after: string}>) => {
  try { self.postMessage({ok:true,result:compareFiles(event.data.before,event.data.after)}) }
  catch(failure) { self.postMessage({ok:false,code:failure instanceof FileDiffError ? failure.code : 'failed'}) }
}
