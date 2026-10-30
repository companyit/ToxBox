import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { resolveSeoEnvironment } from '../src/utils/seoEnvironment.ts'

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '')
const candidatesRoot = path.join(repositoryRoot, '.ci/release-01/candidates')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const order = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fail = message => { throw Error(message) }
const git = (...args) => execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' })

export function validateCandidateId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(id)) fail('候选ID必须为1至64个ASCII字母、数字或短横线')
  return id
}

export async function assertSafePath(filename, { directory = false } = {}) {
  const absolute = path.resolve(filename)
  if (absolute !== repositoryRoot && !absolute.startsWith(repositoryRoot + path.sep)) fail('路径越过仓库边界')
  if (await fs.realpath(repositoryRoot) !== repositoryRoot) fail('仓库根不能为符号链接')
  let cursor = repositoryRoot
  const parts = path.relative(repositoryRoot, absolute).split(path.sep).filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    cursor = path.join(cursor, parts[i])
    const info = await fs.lstat(cursor)
    if (info.isSymbolicLink()) fail('禁止符号链接')
    if (i < parts.length - 1 || directory) {
      if (!info.isDirectory()) fail('目录类型错误')
    } else if (!info.isFile() || info.nlink !== 1) fail('只允许独立普通文件')
  }
  return absolute
}

export async function readSafeFile(filename) {
  await assertSafePath(filename)
  const handle = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const before = await handle.stat()
    if (!before.isFile() || before.nlink !== 1) fail('输入不是独立普通文件')
    const bytes = await handle.readFile()
    const after = await handle.stat()
    const visible = await fs.lstat(filename)
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs
      || visible.isSymbolicLink() || visible.ino !== after.ino || visible.dev !== after.dev
      || bytes.length !== after.size) fail('读取期间文件发生变化')
    return bytes
  } finally { await handle.close() }
}

export async function digestDirectory(directory) {
  await assertSafePath(directory, { directory: true })
  const result = {}
  async function walk(folder) {
    const entries = await fs.readdir(folder, { withFileTypes: true })
    for (const entry of entries.sort((a, b) => order(a.name, b.name))) {
      const file = path.join(folder, entry.name)
      if (entry.isSymbolicLink()) fail('目录含符号链接')
      if (entry.isDirectory()) await walk(file)
      else if (entry.isFile()) {
        const bytes = await readSafeFile(file)
        result[path.relative(directory, file).split(path.sep).join('/')] = { size: bytes.length, sha256: hash(bytes) }
      } else fail('目录含未知文件类型')
    }
  }
  await walk(directory)
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => order(a, b)))
}

export async function createSeoEnvelope(raw) {
  const approved = JSON.parse((await readSafeFile(path.join(repositoryRoot, 'config/site-release.json'))).toString('utf8'))
  const environment = resolveSeoEnvironment(raw, approved)
  const minimalRaw = environment.mode === 'production'
    ? { mode: environment.mode, origin: environment.approvedOrigin } : { mode: environment.mode }
  return {
    raw: minimalRaw,
    approvedConfig: { schemaVersion: approved.schemaVersion, productionOrigin: approved.productionOrigin, indexableRouteNames: [...approved.indexableRouteNames] },
  }
}

function checkEnvironmentConflict(envelope) {
  const env = process.env
  if (env.SSG_SEO_MODE !== undefined && (env.SSG_SEO_MODE !== 'preview' || envelope.raw.mode !== 'preview')) fail('旧SSG_SEO_MODE与候选模式冲突')
  if (env.WORKDEV_SEO_MODE !== undefined && env.WORKDEV_SEO_MODE !== envelope.raw.mode) fail('显式SEO模式冲突')
  if (env.WORKDEV_SITE_ORIGIN !== undefined && env.WORKDEV_SITE_ORIGIN !== envelope.raw.origin) fail('显式SEO origin冲突')
}

export async function inputSnapshot() {
  if (git('rev-parse', '--show-toplevel').trim() !== repositoryRoot) fail('Git根目录不一致')
  const files = new Set(git('ls-files', '-z').split('\0').filter(Boolean))
  // Include approved untracked implementation/tests, never ignored .env or build outputs.
  for (const folder of ['src', 'config', 'scripts', 'tests', 'e2e', '.github']) {
    const root = path.join(repositoryRoot, folder)
    await assertSafePath(root, { directory: true })
    const entries = await digestDirectory(root)
    for (const name of Object.keys(entries)) files.add(folder + '/' + name)
  }
  const inputs = {}
  for (const name of [...files].sort(order)) inputs[name] = hash(await readSafeFile(path.join(repositoryRoot, name)))
  const versions = {}
  for (const name of ['vite', 'vue', 'vue-router', '@playwright/test']) {
    const json = JSON.parse(await fs.readFile(path.join(repositoryRoot, 'node_modules', name, 'package.json'), 'utf8'))
    versions[name] = json.version
  }
  return {
    head: git('rev-parse', 'HEAD').trim(),
    dirtyDiffSha256: hash(execFileSync('git', ['diff', '--no-ext-diff', '--binary'], { cwd: repositoryRoot })),
    node: process.versions.node, versions, files: inputs,
  }
}

async function writeExclusive(filename, bytes) {
  await assertSafePath(path.dirname(filename), { directory: true })
  const file = await fs.open(filename, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
  try { await file.writeFile(bytes); await file.sync() } finally { await file.close() }
}

async function exists(filename) {
  try { await fs.lstat(filename); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error }
}

async function ensureCandidateRoot() {
  let cursor = repositoryRoot
  for (const part of ['.ci', 'release-01', 'candidates']) {
    cursor = path.join(cursor, part)
    if (!await exists(cursor)) await fs.mkdir(cursor, { mode: 0o700 })
    await assertSafePath(cursor, { directory: true })
  }
}

function receiptLocation(receiptPath) {
  if (typeof receiptPath !== 'string' || !receiptPath) fail('缺少候选receipt路径')
  const absolute = path.resolve(repositoryRoot, receiptPath)
  const relative = path.relative(candidatesRoot, absolute).split(path.sep)
  if (relative.length !== 2 || relative[1] !== 'receipt.json') fail('receipt只能来自受控候选根')
  const id = validateCandidateId(relative[0])
  return { id, root: path.join(candidatesRoot, id), receipt: absolute }
}

/** Read-only, explicit expected digest required; no build, restore or server side effect. */
export async function verifyCandidate(receiptPath, expectedSha) {
  if (typeof expectedSha !== 'string' || !/^[a-f0-9]{64}$/.test(expectedSha)) fail('缺少独立预期receipt SHA256')
  const location = receiptLocation(receiptPath)
  await assertSafePath(location.root, { directory: true })
  const bytes = await readSafeFile(location.receipt)
  if (hash(bytes) !== expectedSha) fail('独立receipt摘要不符')
  const success = await readSafeFile(path.join(location.root, 'SUCCESS'))
  if (success.toString('utf8') !== expectedSha + '\n') fail('SUCCESS没有绑定有效receipt')
  const receipt = JSON.parse(bytes.toString('utf8'))
  if (receipt.schemaVersion !== 1 || receipt.candidateId !== location.id || receipt.status !== 'validated'
    || receipt.output?.root !== 'output/dist-ssg' || receipt.ssrManifest?.path !== 'metadata/ssr-manifest.json') fail('receipt schema或受控路径不符')
  const envelope = await createSeoEnvelope(receipt.seo?.raw)
  if (!same(envelope, receipt.seo) || receipt.seoSha256 !== hash(Buffer.from(JSON.stringify(envelope)))) fail('receipt SEO配置或摘要不符')
  checkEnvironmentConflict(envelope)
  if (!same(receipt.input, await inputSnapshot())) fail('候选输入来源已变化')
  const output = path.join(location.root, 'output/dist-ssg')
  if (!same(receipt.output.files, await digestDirectory(output))) fail('候选产物集合/大小/SHA不符')
  const manifestPath = path.join(location.root, 'metadata/ssr-manifest.json')
  if (hash(await readSafeFile(manifestPath)) !== receipt.ssrManifest.sha256) fail('SSR manifest摘要不符')
  const { validateCandidateOutput } = await import('./ssg.mjs')
  const validation = await validateCandidateOutput(output, envelope, manifestPath)
  if (!same(validation, receipt.validation)) fail('候选HTML/SEO验收记录不符')
  if (!same(receipt.protectedDirectories, await protectedDirectories())) fail('旧SSG产物或中间目录发生变化')
  // Re-read after semantic checks; detect changes during verification.
  if (hash(await readSafeFile(location.receipt)) !== expectedSha
    || (await readSafeFile(path.join(location.root, 'SUCCESS'))).toString('utf8') !== expectedSha + '\n'
    || !same(receipt.output.files, await digestDirectory(output))
    || !same(receipt.input, await inputSnapshot())) fail('验证期间候选发生变化')
  return { ...location, output, manifestPath, envelope, receipt, receiptSha256: expectedSha }
}

async function protectedDirectories() {
  const result = {}
  for (const name of ['dist-ssg', '.ssg-build']) result[name] = await exists(path.join(repositoryRoot, name))
    ? await digestDirectory(path.join(repositoryRoot, name)) : null
  return result
}

/** Vite config reads this; importing this module does not execute the CLI. */
export async function resolveViteSeoContext(isPreview) {
  if (isPreview && process.env.WORKDEV_CANDIDATE_RECEIPT) {
    if (process.env.WORKDEV_RELEASE_BUILD_ID) fail('预览与构建上下文冲突')
    const candidate = await verifyCandidate(process.env.WORKDEV_CANDIDATE_RECEIPT, process.env.WORKDEV_CANDIDATE_RECEIPT_SHA)
    return { envelope: candidate.envelope, candidate }
  }
  if (process.env.WORKDEV_CANDIDATE_RECEIPT || process.env.WORKDEV_CANDIDATE_RECEIPT_SHA) fail('候选预览参数不完整或用于错误入口')
  const id = process.env.WORKDEV_RELEASE_BUILD_ID
  if (id !== undefined) {
    if (isPreview) fail('构建上下文不得用于preview')
    validateCandidateId(id)
    const root = path.join(candidatesRoot, id)
    const lock = JSON.parse((await readSafeFile(path.join(root, 'writer.lock'))).toString('utf8'))
    const context = JSON.parse((await readSafeFile(path.join(root, 'metadata/build-context.json'))).toString('utf8'))
    if (lock.pid !== process.pid || context.pid !== process.pid || lock.candidateId !== id || context.candidateId !== id
      || context.schemaVersion !== 1 || !same(context.input, await inputSnapshot())) fail('构建上下文没有匹配当前单写者/输入')
    const envelope = await createSeoEnvelope(context.seo.raw)
    if (!same(envelope, context.seo)) fail('构建上下文SEO不符')
    checkEnvironmentConflict(envelope)
    return { envelope, candidate: null }
  }
  const envelope = await createSeoEnvelope({ mode: 'preview' })
  checkEnvironmentConflict(envelope)
  return { envelope, candidate: null }
}

export async function buildCandidate({ candidateId, mode, origin }) {
  validateCandidateId(candidateId)
  if (mode !== 'preview' && mode !== 'production') fail('候选必须显式选择preview或production')
  const raw = mode === 'production' ? { mode, origin } : { mode }
  if (mode === 'preview' && origin !== undefined) fail('preview不得设置origin')
  const envelope = await createSeoEnvelope(raw)
  checkEnvironmentConflict(envelope)
  if (process.env.WORKDEV_RELEASE_BUILD_ID || process.env.WORKDEV_CANDIDATE_RECEIPT || process.env.WORKDEV_CANDIDATE_RECEIPT_SHA) fail('不得嵌套构建或混用预览上下文')
  if ((await readSafeFile(path.join(repositoryRoot, '.node-version'))).toString('utf8').trim().replace(/^v/, '') !== process.versions.node) fail('Node版本与固定基线不符')
  const input = await inputSnapshot()
  const protectedBefore = await protectedDirectories()
  await ensureCandidateRoot()
  const root = path.join(candidatesRoot, candidateId)
  // No recursive mkdir or removal for an ID: a failed/existing ID is never reused.
  await fs.mkdir(root, { mode: 0o700 })
  await assertSafePath(root, { directory: true })
  await fs.access(root, constants.R_OK | constants.W_OK | constants.X_OK)
  const started = new Date().toISOString()
  await writeExclusive(path.join(root, 'writer.lock'), JSON.stringify({ schemaVersion: 1, candidateId, pid: process.pid, started }) + '\n')
  const timer = setTimeout(() => { console.error('候选构建整体超时，禁止使用未完成候选'); process.exit(1) }, 300000)
  try {
    for (const name of ['work', 'staging', 'output', 'metadata', 'diagnostics']) await fs.mkdir(path.join(root, name), { mode: 0o700 })
    await fs.mkdir(path.join(root, 'staging/dist-ssg'), { mode: 0o700 })
    await writeExclusive(path.join(root, 'metadata/build-context.json'), JSON.stringify({ schemaVersion: 1, candidateId, pid: process.pid, seo: envelope, input }) + '\n')
    process.env.WORKDEV_RELEASE_BUILD_ID = candidateId
    const { generateCandidate, validateCandidateOutput } = await import('./ssg.mjs')
    const generated = await generateCandidate({ candidateRoot: root, envelope })
    if (!same(input, await inputSnapshot()) || !same(protectedBefore, await protectedDirectories())) fail('构建输入或旧产物发生变化')
    const outputParent = path.join(root, 'output')
    const output = path.join(outputParent, 'dist-ssg')
    await assertSafePath(generated.staging, { directory: true })
    await assertSafePath(outputParent, { directory: true })
    if ((await fs.stat(generated.staging)).dev !== (await fs.stat(outputParent)).dev) fail('禁止跨设备提交候选')
    if (await exists(output)) fail('禁止覆盖已有output')
    // EXDEV is deliberately not caught or converted into a copy operation.
    await fs.rename(generated.staging, output)
    const validation = await validateCandidateOutput(output, envelope, generated.manifestPath)
    if (!same(validation, generated.validation)) fail('提交前后验证结果不符')
    const outputFiles = await digestDirectory(output)
    const receipt = {
      schemaVersion: 1, status: 'validated', candidateId,
      started, finished: new Date().toISOString(),
      seo: envelope, seoSha256: hash(Buffer.from(JSON.stringify(envelope))), input,
      protectedDirectories: protectedBefore,
      output: { root: 'output/dist-ssg', files: outputFiles },
      ssrManifest: { path: 'metadata/ssr-manifest.json', sha256: hash(await readSafeFile(generated.manifestPath)) },
      validation,
    }
    const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n')
    if (!same(input, await inputSnapshot()) || !same(protectedBefore, await protectedDirectories())) fail('提交receipt前来源发生变化')
    await writeExclusive(path.join(root, 'receipt.tmp'), bytes)
    if (await exists(path.join(root, 'receipt.json'))) fail('receipt已存在')
    await fs.rename(path.join(root, 'receipt.tmp'), path.join(root, 'receipt.json'))
    if (!same(outputFiles, await digestDirectory(output)) || !same(input, await inputSnapshot())
      || !same(protectedBefore, await protectedDirectories())
      || hash(await readSafeFile(path.join(root, 'receipt.json'))) !== hash(bytes)) fail('最终提交期间候选发生变化')
    const receiptSha256 = hash(bytes)
    await writeExclusive(path.join(root, 'SUCCESS'), receiptSha256 + '\n')
    return { candidateId, receipt: path.relative(repositoryRoot, path.join(root, 'receipt.json')), receiptSha256 }
  } catch (error) {
    // Keep all failed bytes. A failed ID remains occupied and is not retryable.
    if (await exists(path.join(root, 'diagnostics'))) {
      try { await writeExclusive(path.join(root, 'diagnostics/failed.json'), JSON.stringify({ failed: new Date().toISOString(), message: error.message }) + '\n') } catch { /* Preserve the original failure. */ }
    }
    throw error
  } finally {
    clearTimeout(timer)
    delete process.env.WORKDEV_RELEASE_BUILD_ID
  }
}

export async function previewCandidate(receiptPath, expectedSha) {
  const candidate = await verifyCandidate(receiptPath, expectedSha)
  const environment = { ...process.env, WORKDEV_CANDIDATE_RECEIPT: candidate.receipt, WORKDEV_CANDIDATE_RECEIPT_SHA: expectedSha }
  delete environment.WORKDEV_RELEASE_BUILD_ID
  let child
  const terminate = () => { if (child?.pid) { try { process.kill(-child.pid, 'SIGTERM') } catch { /* Already exited. */ } } }
  const signals = ['SIGINT', 'SIGTERM']
  for (const signal of signals) process.once(signal, terminate)
  try {
    const result = await new Promise((resolve, reject) => {
      child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--outDir', candidate.output, '--host', '127.0.0.1', '--port', '4177', '--strictPort'], {
        cwd: repositoryRoot, env: environment, stdio: 'inherit', detached: true,
      })
      child.once('error', reject)
      child.once('close', (code, signal) => resolve({ code, signal }))
    })
    await verifyCandidate(receiptPath, expectedSha)
    return result
  } finally {
    terminate()
    for (const signal of signals) process.off(signal, terminate)
  }
}

function parseArguments(argv) {
  const [command, ...rest] = argv
  const accepted = { build: ['candidate', 'mode', 'origin'], verify: ['receipt', 'expected-sha'], preview: ['receipt', 'expected-sha'] }
  if (!Object.hasOwn(accepted, command)) fail('需要build、verify或preview子命令')
  const values = Object.create(null)
  for (let i = 0; i < rest.length; i += 2) {
    const option = rest[i]
    const value = rest[i + 1]
    if (!option?.startsWith('--') || !accepted[command].includes(option.slice(2)) || value === undefined || value.startsWith('--') || Object.hasOwn(values, option.slice(2))) fail('未知、重复或缺失CLI参数')
    values[option.slice(2)] = value
  }
  return { command, values }
}

async function main() {
  if (await fs.realpath(process.cwd()) !== repositoryRoot) fail('必须在唯一仓库根执行')
  const { command, values } = parseArguments(process.argv.slice(2))
  if (command === 'build') {
    const result = await buildCandidate({ candidateId: values.candidate, mode: values.mode, origin: values.origin })
    // Capture this value independently in the approved run log; consumers must supply it.
    console.log(JSON.stringify(result, null, 2))
  } else {
    const receipt = values.receipt ?? process.env.WORKDEV_CANDIDATE_RECEIPT
    const expected = values['expected-sha'] ?? process.env.WORKDEV_CANDIDATE_RECEIPT_SHA
    if (values.receipt && process.env.WORKDEV_CANDIDATE_RECEIPT && path.resolve(repositoryRoot, values.receipt) !== path.resolve(repositoryRoot, process.env.WORKDEV_CANDIDATE_RECEIPT)) fail('CLI与环境receipt冲突')
    if (values['expected-sha'] && process.env.WORKDEV_CANDIDATE_RECEIPT_SHA && values['expected-sha'] !== process.env.WORKDEV_CANDIDATE_RECEIPT_SHA) fail('CLI与环境预期SHA冲突')
    if (command === 'verify') {
      const candidate = await verifyCandidate(receipt, expected)
      console.log(JSON.stringify({ candidateId: candidate.id, receiptSha256: candidate.receiptSha256, status: 'verified' }))
    } else {
      const result = await previewCandidate(receipt, expected)
      if (result.code !== 0 || result.signal) process.exitCode = 1
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main() } catch (error) { console.error(error.message); process.exitCode = 1 }
}
