import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { buildCandidate, verifyCandidate, repositoryRoot } from '../../scripts/release-candidate.mjs'
import { createPackage, verifyPackage } from '../../scripts/release-package.mjs'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const id = 'release-' + Date.now() + '-' + randomUUID().slice(0, 8)
const root = path.join(repositoryRoot, '.ci/release-01/candidates')

test('REL-FAIL/REL-PACK：独立候选、失败关闭和部署包', async t => {
  const production = await buildCandidate({ candidateId: id + '-prod', mode: 'production', origin: 'https://www.v7luck.com' })
  const preview = await buildCandidate({ candidateId: id + '-preview', mode: 'preview' })
  await t.test('production/preview正向验收', async () => {
    await verifyCandidate(production.receipt, production.receiptSha256)
    await verifyCandidate(preview.receipt, preview.receiptSha256)
  })
  await t.test('拒绝preview部署包', async () => assert.rejects(createPackage({ packageId: id + '-no', receipt: preview.receipt, expectedSha: preview.receiptSha256 }), /production/))
  await t.test('拒绝复用候选ID', async () => assert.rejects(buildCandidate({ candidateId: id + '-prod', mode: 'production', origin: 'https://www.v7luck.com' })))
  let sequence = 0
  async function fixture() {
    const candidateId = id + '-f' + sequence++
    const folder = path.join(root, candidateId)
    await fs.cp(path.join(root, id + '-prod'), folder, { recursive: true, errorOnExist: true, force: false })
    const receipt = path.join(folder, 'receipt.json')
    const value = JSON.parse(await fs.readFile(receipt)); value.candidateId = candidateId
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); const sha = hash(bytes)
    await fs.writeFile(receipt, bytes); await fs.writeFile(path.join(folder, 'SUCCESS'), sha + '\n')
    await verifyCandidate(receipt, sha)
    return { folder, receipt, sha }
  }
  for (const kind of ['SUCCESS', 'output', 'manifest', 'receipt', 'extra', 'symlink']) {
    await t.test('候选拒绝：' + kind, async () => {
      const f = await fixture()
      if (kind === 'SUCCESS') await fs.unlink(path.join(f.folder, 'SUCCESS'))
      if (kind === 'output') await fs.appendFile(path.join(f.folder, 'output/dist-ssg/index.html'), 'corrupt')
      if (kind === 'manifest') await fs.appendFile(path.join(f.folder, 'metadata/ssr-manifest.json'), 'corrupt')
      if (kind === 'receipt') await fs.appendFile(f.receipt, ' ')
      if (kind === 'extra') await fs.writeFile(path.join(f.folder, 'output/dist-ssg/unapproved.txt'), 'extra')
      if (kind === 'symlink') await fs.symlink('index.html', path.join(f.folder, 'output/dist-ssg/link.html'))
      await assert.rejects(verifyCandidate(f.receipt, f.sha))
    })
  }
  const pack = await createPackage({ packageId: id, receipt: production.receipt, expectedSha: production.receiptSha256 })
  await t.test('生产部署包独立验收', async () => { assert.ok(pack.files >= 11); await verifyPackage(id, pack.manifestSha256) })
  await t.test('部署包拒绝复用ID', async () => assert.rejects(createPackage({ packageId: id, receipt: production.receipt, expectedSha: production.receiptSha256 })))
  for (const kind of ['missing', 'extra', 'corrupt', 'symlink', 'wrong-sha']) {
    await t.test('部署包拒绝：' + kind, async () => {
      if (kind === 'wrong-sha') { await assert.rejects(verifyPackage(id, '0'.repeat(64))); return }
      const targetId = id + '-p' + sequence++
      const folder = path.join(repositoryRoot, '.ci/release-01/packages', targetId)
      await fs.cp(pack.root, folder, { recursive: true, force: false, errorOnExist: true })
      const file = path.join(folder, 'manifest.json'); const value = JSON.parse(await fs.readFile(file)); value.packageId = targetId
      const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); const sha = hash(bytes)
      await fs.writeFile(file, bytes); await fs.writeFile(path.join(folder, 'SUCCESS'), sha + '\n')
      await verifyPackage(targetId, sha)
      if (kind === 'missing') await fs.unlink(path.join(folder, 'SUCCESS'))
      if (kind === 'extra') await fs.writeFile(path.join(folder, 'site/extra.txt'), 'extra')
      if (kind === 'corrupt') await fs.appendFile(path.join(folder, 'site/index.html'), 'corrupt')
      if (kind === 'symlink') await fs.symlink('index.html', path.join(folder, 'site/link.html'))
      await assert.rejects(verifyPackage(targetId, sha))
    })
  }
  console.log('RELEASE_HANDOFF ' + JSON.stringify({ production, preview, package: pack }))
})
