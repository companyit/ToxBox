import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { repositoryRoot, validateCandidateId, assertSafePath, readSafeFile, digestDirectory, verifyCandidate } from './release-candidate.mjs'

const packagesRoot = path.join(repositoryRoot, '.ci/release-01/packages')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fail = message => { throw new Error(message) }
const rootFor = id => path.join(packagesRoot, validateCandidateId(id))

export async function verifyPackage(packageId, expectedSha) {
  if (!/^[a-f0-9]{64}$/.test(expectedSha ?? '')) fail('必须提供独立package manifest SHA256')
  const root = rootFor(packageId)
  await assertSafePath(root, { directory: true })
  const bytes = await readSafeFile(path.join(root, 'manifest.json'))
  if (hash(bytes) !== expectedSha) fail('package manifest摘要不符')
  if ((await readSafeFile(path.join(root, 'SUCCESS'))).toString() !== expectedSha + '\n') fail('package SUCCESS不符')
  const manifest = JSON.parse(bytes)
  if (manifest.schemaVersion !== 1 || manifest.packageId !== packageId || manifest.mode !== 'production'
    || manifest.origin !== 'https://www.v7luck.com') fail('package合同不符')
  const initial = await digestDirectory(root)
  const all = { ...initial }
  delete all['manifest.json']; delete all.SUCCESS
  if (!same(all, manifest.files)) fail('package文件集合、大小或SHA不符')
  for (const file of Object.keys(all)) {
    if (!file.startsWith('site/') && !['metadata/receipt.json', 'metadata/ssr-manifest.json'].includes(file)) fail('package含未批准文件')
  }
  const receipt = await readSafeFile(path.join(root, 'metadata/receipt.json'))
  if (hash(receipt) !== manifest.receiptSha256) fail('package来源摘要不符')
  const source = JSON.parse(receipt)
  const site = Object.fromEntries(Object.entries(all).filter(([name]) => name.startsWith('site/')).map(([name, value]) => [name.slice(5), value]))
  if (source.candidateId !== manifest.candidateId || source.seo?.raw?.mode !== 'production'
    || !same(site, source.output?.files)
    || all['metadata/ssr-manifest.json']?.sha256 !== source.ssrManifest?.sha256) fail('package与来源不一致')
  if (hash(await readSafeFile(path.join(root, 'manifest.json'))) !== expectedSha
    || !same(await digestDirectory(root), initial)) fail('package读取期间变化')
  return { packageId, root, site: path.join(root, 'site'), manifestSha256: expectedSha, files: Object.keys(site).length }
}

export async function createPackage({ packageId, receipt, expectedSha }) {
  const root = rootFor(packageId)
  const candidate = await verifyCandidate(receipt, expectedSha)
  if (candidate.receipt.seo.raw.mode !== 'production') fail('只允许production候选导出')
  await assertSafePath(path.dirname(packagesRoot), { directory: true })
  await fs.mkdir(packagesRoot, { recursive: true })
  await assertSafePath(packagesRoot, { directory: true })
  await fs.mkdir(root) // Exclusive ownership: never reuse or overwrite a package ID.
  await fs.mkdir(path.join(root, 'site'))
  await fs.mkdir(path.join(root, 'metadata'))
  for (const relative of Object.keys(candidate.receipt.output.files)) {
    const target = path.join(root, 'site', relative)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, await readSafeFile(path.join(candidate.output, relative)), { flag: 'wx' })
  }
  await fs.writeFile(path.join(root, 'metadata/receipt.json'), await readSafeFile(path.join(candidate.root, 'receipt.json')), { flag: 'wx' })
  await fs.writeFile(path.join(root, 'metadata/ssr-manifest.json'), await readSafeFile(candidate.manifestPath), { flag: 'wx' })
  await verifyCandidate(receipt, expectedSha)
  const files = await digestDirectory(root)
  const manifest = { schemaVersion: 1, packageId, candidateId: candidate.id, mode: 'production', origin: 'https://www.v7luck.com', receiptSha256: expectedSha, files }
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
  const manifestSha256 = hash(bytes)
  await fs.writeFile(path.join(root, 'manifest.json'), bytes, { flag: 'wx' })
  // Verify every copied byte before committing SUCCESS.
  const copied = await digestDirectory(root); delete copied['manifest.json']
  if (!same(copied, files)) fail('导出期间文件变化')
  await fs.writeFile(path.join(root, 'SUCCESS'), manifestSha256 + '\n', { flag: 'wx' })
  return verifyPackage(packageId, manifestSha256)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.cwd() !== repositoryRoot) fail('必须从仓库根执行')
    const [command, ...args] = process.argv.slice(2)
    const values = {}
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]
      if (!['--package', '--receipt', '--expected-sha'].includes(key) || !args[i + 1] || key in values) fail('无效或重复参数')
      values[key] = args[i + 1]
    }
    if (command === 'create' && values['--receipt']) console.log(JSON.stringify(await createPackage({ packageId: values['--package'], receipt: values['--receipt'], expectedSha: values['--expected-sha'] }), null, 2))
    else if (command === 'verify' && !values['--receipt']) console.log(JSON.stringify(await verifyPackage(values['--package'], values['--expected-sha']), null, 2))
    else fail('用法：create --package ID --receipt PATH --expected-sha SHA；verify --package ID --expected-sha SHA')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
