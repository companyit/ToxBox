import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const source = fileURLToPath(new URL('../node_modules/pdfjs-dist/', import.meta.url))
const groups = { cmaps: /\.bcmap$/, standard_fonts: /\.(?:pfb|ttf)$/, iccs: /\.icc$/, wasm: /^(?:openjpeg|jbig2|qcms_bg)\.wasm$|^(?:openjpeg|jbig2)_nowasm_fallback\.js$/ }
export async function pdfResourceFiles() {
  const pkg = JSON.parse(await fs.readFile(path.join(source, 'package.json'), 'utf8'))
  if (pkg.version !== '6.5.438') throw Error('PDF资源版本不符合批准版本')
  const result = new Map()
  for (const [group, pattern] of Object.entries(groups)) for (const name of (await fs.readdir(path.join(source, group))).sort()) {
    if (!pattern.test(name)) continue
    const bytes = await fs.readFile(path.join(source, group, name))
    result.set(`pdf-assets/${group}/${name}`, { bytes, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  if (result.size !== 188) throw Error('PDF资源集合发生变化，须重新核验')
  return result
}
export function pdfResourcesPlugin() {
  return { name: 'approved-pdf-resources', async generateBundle(_options, bundle) {
    // The SSR server never distributes renderer resources.
    if (Object.values(bundle).some(x => x.type === 'chunk' && x.isEntry && x.facadeModuleId?.endsWith('entry-server.ts'))) return
    for (const [fileName, { bytes }] of await pdfResourceFiles()) this.emitFile({ type: 'asset', fileName, source: bytes })
  } }
}
