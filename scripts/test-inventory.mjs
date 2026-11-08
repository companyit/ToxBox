import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

export function validateInventory(rows, discovered) {
  assert.equal(rows.length, 154, '旧身份必须完整保留154项')
  assert.equal(new Set(rows.map(row => row.id)).size, 154, '旧身份重复')
  assert.equal(new Set(rows.map(row => row.source + ':' + row.title)).size, 154, '原用例重复')
  assert.equal(discovered.length, 154, '发现数量与迁移账本不符')
  for (const row of rows) {
    assert.equal(row.owner, 'vitest', `${row.id} owner错误`)
    const owners = discovered.filter(test => test.name === `${row.id} ${row.title}`)
    assert.equal(owners.length, 1, `${row.id}缺项或重复owner`)
    assert.equal(path.relative(process.cwd(), owners[0].file), row.target, `${row.id}目标错误`)
    assert.equal(owners[0].projectName, row.target.split('/')[1], `${row.id}项目错误`)
  }
  for (const [prefix, count] of Object.entries({ TXT:54, JSON:25, URL:30, TXTC:8, JSONC:8, URLC:9, ROUTE:17, SSG:3 })) {
    assert.equal(rows.filter(row => row.id.startsWith(prefix+'-')).length, count)
  }
}

// 旧摘要不可覆盖；已登记演进同时验证原始快照与当前完整源。
export function validateSourceIntegrity(row, current, evolution, snapshot) {
  const sha = bytes => createHash('sha256').update(bytes).digest('hex')
  if (!evolution) {
    assert.equal(sha(current), row.sourceSha256, `${row.source}旧资产已改变`)
    return
  }
  assert.equal(evolution.source, row.source, '源演进路径不匹配')
  assert.equal(evolution.originalSha256, row.sourceSha256, '原始迁移摘要不匹配')
  assert.ok(evolution.reason && evolution.snapshot, '源演进缺少依据或快照')
  assert.equal(sha(snapshot), row.sourceSha256, '历史快照已改变')
  assert.equal(sha(current), evolution.currentSha256, '当前源存在未登记修改')
}

async function main() {
  const rows = JSON.parse(await fs.readFile('tests/migration.json', 'utf8'))
  const evolutions = JSON.parse(await fs.readFile('tests/source-evolution.json', 'utf8'))
  assert.equal(new Set(evolutions.map(entry => entry.source)).size, evolutions.length, '源演进重复登记')
  for (const entry of evolutions) assert.ok(rows.some(row => row.source === entry.source), '登记了未知历史源')
  const design = await fs.readFile('docs/specs/007-testing-ci/design.md', 'utf8')
  const mapped = [...design.matchAll(/^\| ((?:TXT|JSON|URL|TXTC|JSONC|URLC|ROUTE|SSG)-\d+) \| ([^：]+)：(.+?) \| (.+?) \|/gm)]
  assert.equal(mapped.length, 154)
  for (const row of rows) {
    const approved = mapped.filter(match => match[1] === row.id)
    assert.equal(approved.length, 1)
    assert.deepEqual([row.source, row.title, row.target], ['tests/'+approved[0][2], approved[0][3], 'tests/'+approved[0][4]])
    const evolution = evolutions.find(entry => entry.source === row.source)
    validateSourceIntegrity(row, await fs.readFile(row.source), evolution, evolution ? await fs.readFile(evolution.snapshot) : undefined)
    const target = await fs.readFile(row.target, 'utf8')
    assert.doesNotMatch(target, /from ['"]node:test['"]|\b(?:test|it)\.(?:skip|todo|only)\s*\(/, '禁止旧runner或跳过断言')
  }
  const discovered = JSON.parse(execFileSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'list', '--project', 'unit', '--project', 'components', '--project', 'ssg', '--json'], { encoding: 'utf8' }))
  // 新增功能用例独立于固定的历史迁移身份；仍完整检查原 154 项。
  const migrated = discovered.filter(entry => /^(TXT|JSON|URL|TXTC|JSONC|URLC|ROUTE|SSG)-\d+ /.test(entry.name))
  validateInventory(rows, migrated)
  assert.throws(() => validateInventory(rows.slice(1), migrated))
  assert.throws(() => validateInventory([...rows.slice(1), rows[1]], migrated))
  assert.throws(() => validateInventory(rows, migrated.slice(1)))
  assert.throws(() => validateInventory(rows, [...migrated.slice(1), migrated[1]]))
  console.log('154项映射/原文件SHA/唯一owner/发现目录通过；缺项及重复身份/owner负向夹具均被拒绝。默认151，SSG3，旧runner仅作对照。')
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
