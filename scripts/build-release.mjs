import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes, createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { repositoryRoot, buildCandidate, digestDirectory, readSafeFile, assertSafePath } from './release-candidate.mjs'
import { createPackage, verifyPackage } from './release-package.mjs'

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repositoryRoot, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} 执行失败（${signal ?? code}）`)))
  })
}

try {
  if (process.cwd() !== repositoryRoot) throw new Error('必须从仓库根执行')
  if (process.argv.length !== 2) throw new Error('此命令无需参数；正式域名由 config/site-release.json 管理')
  await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'type-check'])
  const config = JSON.parse((await readSafeFile(path.join(repositoryRoot, 'config/site-release.json'))).toString())
  const id = `toolhug-${new Date().toISOString().replace(/\D/g, '')}-${randomBytes(4).toString('hex')}`
  const candidate = await buildCandidate({ candidateId: id, mode: 'production', origin: config.productionOrigin })
  const packaged = await createPackage({ packageId: id, receipt: candidate.receipt, expectedSha: candidate.receiptSha256 })
  const handoffRoot = path.join(repositoryRoot, '.ci/handoff')
  await fs.mkdir(handoffRoot, { recursive: true })
  await assertSafePath(handoffRoot, { directory: true })
  const handoff = path.join(handoffRoot, id)
  await fs.mkdir(handoff)
  const archiveName = `${id}-site.tar.gz`
  const archive = path.join(handoff, archiveName)
  await run('tar', ['-czf', archive, '-C', packaged.site, '.'])
  // Keep extraction inside the repository so the shared safe-path/hash rules apply.
  const extracted = await fs.mkdtemp(path.join(handoff, 'verify-'))
  try {
    await run('tar', ['-xzf', archive, '-C', extracted])
    if (JSON.stringify(await digestDirectory(extracted)) !== JSON.stringify(await digestDirectory(packaged.site))) {
      throw new Error('归档内容与正式站点不一致')
    }
  } finally {
    await fs.rm(extracted, { recursive: true, force: true })
  }
  await verifyPackage(id, packaged.manifestSha256)
  const sha256 = createHash('sha256').update(await readSafeFile(archive)).digest('hex')
  await fs.writeFile(path.join(handoff, `${archiveName}.sha256`), `${sha256}  ${archiveName}\n`, { flag: 'wx' })
  const dist = path.join(repositoryRoot, 'dist')
  const staging = path.join(handoff, 'dist-staging')
  const previousDist = path.join(handoff, 'previous-dist')
  const expectedFiles = await digestDirectory(packaged.site)
  await fs.cp(packaged.site, staging, { recursive: true, errorOnExist: true, force: false })
  if (JSON.stringify(await digestDirectory(staging)) !== JSON.stringify(expectedFiles)) {
    throw new Error('dist 暂存文件校验失败')
  }
  let hadDist = false
  try {
    await fs.lstat(dist)
    await assertSafePath(dist, { directory: true })
    hadDist = true
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (hadDist) await fs.rename(dist, previousDist)
  let installed = false
  try {
    await fs.rename(staging, dist)
    installed = true
    if (JSON.stringify(await digestDirectory(dist)) !== JSON.stringify(expectedFiles)) {
      throw new Error('dist 输出文件校验失败')
    }
  } catch (error) {
    if (installed) await fs.rename(dist, staging)
    if (hadDist) await fs.rename(previousDist, dist)
    throw error
  }
  const record = { ...candidate, ...packaged, origin: config.productionOrigin, archive, archiveSha256: sha256,
    dist, previousDist: hadDist ? previousDist : null }
  await fs.writeFile(path.join(handoff, 'handoff.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
  console.log(`\n生产打包完成（未部署）\n正式域名：${config.productionOrigin}\n上传目录：${dist}\n发布包：${archive}\nSHA256：${sha256}\n直接上传 dist/ 中的内容至站点根目录；校验文件和 handoff.json 留在包外。\n`)
} catch (error) {
  console.error(`生产打包失败：${error.message}`)
  process.exitCode = 1
}
