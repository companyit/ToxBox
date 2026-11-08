import { WorkerMessageHandler } from 'pdfjs-dist/build/pdf.worker.mjs'
// Static import installs the message listener before document messages arrive.
// No document is parsed until this module has suppressed diagnostics.
for (const method of ['log', 'warn', 'error', 'info', 'debug'] as const) console[method] = () => {}
void WorkerMessageHandler
