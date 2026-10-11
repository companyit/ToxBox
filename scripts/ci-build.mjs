import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const bundle = '.ci/build'
const manifest = '.ssg-build/client/.vite/ssr-manifest.json'
async function digest(directory) {
  const entries = []
  async function walk(folder) {
    for (const item of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, item.name)
      if (item.isSymbolicLink()) throw Error('禁止产物或输入含符号链接')
      if (item.isDirectory()) await walk(file)
      else if (item.isFile()) entries.push([path.relative(directory, file), createHash('sha256').update(await fs.readFile(file)).digest('hex')])
      else throw Error('不支持的文件类型')
    }
  }
  await walk(directory)
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b, 'en')))
}
async function source() {
  const dirs = Object.fromEntries(await Promise.all(['src', 'e2e', 'tests', 'scripts', '.github'].map(async dir => [dir, await digest(dir)])))
  const names = ['package.json', 'package-lock.json', '.node-version', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', ...(await fs.readdir('.')).filter(name => /^tsconfig.*\.json$/.test(name))]
  const files = Object.fromEntries(await Promise.all(names.sort().map(async name => [name, createHash('sha256').update(await fs.readFile(name)).digest('hex')])))
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== commit) throw Error('checkout与事件commit不同')
  return { commit, node: process.versions.node, dirs, files }
}
export async function prepare() {
  await fs.rm(bundle, { recursive: true, force: true })
  await fs.mkdir(bundle, { recursive: true })
  await fs.cp('dist-ssg', bundle + '/dist-ssg', { recursive: true })
  await fs.copyFile(manifest, bundle + '/ssr-manifest.json')
  await fs.writeFile(bundle + '/receipt.json', JSON.stringify({ source: await source(), output: await digest(bundle + '/dist-ssg'), manifest: createHash('sha256').update(await fs.readFile(manifest)).digest('hex') }, null, 2))
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, 'receipt=' + createHash('sha256').update(await fs.readFile(bundle + '/receipt.json')).digest('hex') + '\n')
}
export async function verify(restore = false) {
  const expected = process.env.WORKDEV_CI_RECEIPT_SHA
  if (process.env.GITHUB_ACTIONS === 'true' && !expected) throw Error('CI缺少上游独立摘要')
  if (expected && expected !== createHash('sha256').update(await fs.readFile(bundle + '/receipt.json')).digest('hex')) throw Error('上游独立摘要不符')
  const receipt = JSON.parse(await fs.readFile(bundle + '/receipt.json', 'utf8'))
  if (JSON.stringify(receipt.source) !== JSON.stringify(await source())) throw Error('构建来源/Node/commit摘要不符')
  if (JSON.stringify(receipt.output) !== JSON.stringify(await digest(bundle + '/dist-ssg'))) throw Error('构建产物摘要不符')
  if (receipt.manifest !== createHash('sha256').update(await fs.readFile(bundle + '/ssr-manifest.json')).digest('hex')) throw Error('SSR manifest摘要不符')
  if (restore) {
    await fs.rm('dist-ssg', { recursive: true, force: true })
    await fs.cp(bundle + '/dist-ssg', 'dist-ssg', { recursive: true })
    await fs.mkdir(path.dirname(manifest), { recursive: true })
    await fs.copyFile(bundle + '/ssr-manifest.json', manifest)
  }
  if (JSON.stringify(receipt.output) !== JSON.stringify(await digest('dist-ssg')) || receipt.manifest !== createHash('sha256').update(await fs.readFile(manifest)).digest('hex')) throw Error('被测产物摘要不符')
  return receipt
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/ci-build.mjs')) {
  if (process.argv[2] === 'prepare') await prepare()
  else if (process.argv[2] === 'verify') await verify()
  else throw Error('需要prepare或verify')
}
