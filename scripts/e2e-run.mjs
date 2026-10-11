import fs from 'node:fs/promises'
import path from 'node:path'
import net from 'node:net'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { verify } from './ci-build.mjs'

const prepared = process.argv[2] === '--prepared'
const projects = process.argv.slice(prepared ? 3 : 2)
if (!projects.length || projects.some(name => !['chromium', 'firefox', 'webkit'].includes(name))) throw Error('必须显式指定本地测试引擎')
if (Number(process.versions.node.split('.')[0]) !== 24) throw Error('测试要求Node24')
const started = Date.now()
const runDir = prepared ? path.resolve('.ci/run') : path.resolve('docs/verification/evidence/m106c3/runs', new Date().toISOString().replaceAll(':', '-') + '-' + process.pid)
if (prepared) await fs.rm(runDir, { recursive: true, force: true })
await fs.mkdir(runDir, { recursive: true })
let child
const stop = signal => { child?.kill(signal); process.exitCode = 1 }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
async function run(command, args, environment = process.env) {
  return await new Promise((resolve, reject) => {
    child = spawn(command, args, { stdio: 'inherit', env: environment })
    child.on('error', reject)
    child.on('exit', (code, signal) => { child = undefined; resolve(code ?? (signal ? 1 : 0)) })
  })
}
async function assertPortFree() {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(4177, '127.0.0.1', () => server.close(resolve))
  })
}
async function digest(directory) {
  const files = {}
  async function walk(folder) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name)
      if (entry.isDirectory()) await walk(filename)
      else files[path.relative(directory, filename)] = createHash('sha256').update(await fs.readFile(filename)).digest('hex')
    }
  }
  await walk(directory)
  return Object.fromEntries(Object.entries(files).sort())
}
const result = { projects, startedUtc: new Date(started).toISOString(), buildExitCode: null, testExitCode: null, portReleased: false }
try {
  await assertPortFree()
  if (prepared) {
    await verify(true)
    result.buildMode = 'verified-artifact'
  } else {
    result.buildExitCode = await run('npm', ['run', 'build'])
    if (result.buildExitCode !== 0) throw Error('本次完整构建失败，禁止使用旧产物')
  }
  const output = await digest('dist-ssg')
  const expected = ['index.html', 'office/index.html', 'office/text-statistics/index.html', 'developer/index.html', 'developer/json-formatter/index.html', 'developer/url-encoder/index.html', 'about/index.html', 'privacy/index.html', '404.html'].sort()
  if (JSON.stringify(Object.keys(output).filter(file => file.endsWith('.html')).sort()) !== JSON.stringify(expected)) throw Error('本次SSG页面集合不完整')
  for (const file of expected) if (!(await fs.readFile(path.join('dist-ssg', file), 'utf8')).includes('data-render-mode="ssg"')) throw Error('必须测试SSG正文')
  const input = await digest('src')
  const tests = await digest('e2e')
  const configSha = createHash('sha256').update(await fs.readFile('playwright.config.ts')).digest('hex')
  const lockSha = createHash('sha256').update(await fs.readFile('package-lock.json')).digest('hex')
  await fs.writeFile(path.join(runDir, 'build-sha256.json'), JSON.stringify({ input, tests, configSha, output, lockSha }, null, 2))
  result.testExitCode = await run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...projects.flatMap(name => ['--project', name])], { ...process.env, WORKDEV_E2E_RUN_DIR: runDir })
  if (JSON.stringify(await digest('dist-ssg')) !== JSON.stringify(output) || JSON.stringify(await digest('src')) !== JSON.stringify(input) || JSON.stringify(await digest('e2e')) !== JSON.stringify(tests) || createHash('sha256').update(await fs.readFile('playwright.config.ts')).digest('hex') !== configSha || createHash('sha256').update(await fs.readFile('package-lock.json')).digest('hex') !== lockSha) throw Error('测试期间被测源/测试/配置/锁/产物改变')
  await assertPortFree()
  result.portReleased = true
  if (prepared) await verify()
  if (result.testExitCode !== 0) process.exitCode = 1
} catch (error) {
  result.error = error instanceof Error ? error.message : '测试执行失败'
  console.error(result.error)
  process.exitCode = 1
} finally {
  result.durationSeconds = (Date.now() - started) / 1000
  await fs.writeFile(path.join(runDir, 'run.json'), JSON.stringify(result, null, 2))
  console.log('本地E2E证据：' + path.relative(process.cwd(), runDir))
  process.removeListener('SIGINT', stop)
  process.removeListener('SIGTERM', stop)
}
