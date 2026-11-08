import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { readdir, mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
const root = fileURLToPath(new URL('./', import.meta.url))
const outDir = fileURLToPath(new URL('../../../.ci/pdf-preview/site/', import.meta.url))
const source = fileURLToPath(new URL('../../../node_modules/pdfjs-dist/', import.meta.url))
export default defineConfig({ root, publicDir: false, worker: { format: 'es' }, build: { outDir, emptyOutDir: true }, plugins: [{ name: 'local-pdf-resources', async closeBundle() {
  const groups = { cmaps: /\.bcmap$/, standard_fonts: /\.(pfb|ttf)$/, iccs: /\.icc$/, wasm: /^(openjpeg|jbig2|qcms_bg)\.wasm$|^(openjpeg|jbig2)_nowasm_fallback\.js$/ }
  for (const [directory, allowed] of Object.entries(groups)) {
    const target = path.join(outDir, 'pdf-assets', directory); await mkdir(target, { recursive: true })
    for (const file of await readdir(path.join(source, directory))) if (allowed.test(file)) await copyFile(path.join(source, directory, file), path.join(target, file))
  }
}}] })
