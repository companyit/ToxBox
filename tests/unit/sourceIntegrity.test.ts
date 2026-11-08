import { expect, test } from 'vitest'
import { createHash } from 'node:crypto'
import { validateSourceIntegrity } from '../../scripts/test-inventory.mjs'
const sha = (value: string) => createHash('sha256').update(value).digest('hex')
test('历史源演进同时保护原始账本、快照及当前文件', () => {
  const row = { source: 'tests/example.mjs', sourceSha256: sha('original') }
  const evolution = { source: row.source, originalSha256: row.sourceSha256, currentSha256: sha('updated'), snapshot: 'snapshot.txt', reason: '新增许可证校验' }
  expect(() => validateSourceIntegrity(row, 'original', undefined, undefined)).not.toThrow()
  expect(() => validateSourceIntegrity(row, 'changed', undefined, undefined)).toThrow()
  expect(() => validateSourceIntegrity(row, 'updated', evolution, 'original')).not.toThrow()
  expect(() => validateSourceIntegrity(row, 'tampered', evolution, 'original')).toThrow()
  expect(() => validateSourceIntegrity(row, 'updated', evolution, 'tampered')).toThrow()
  expect(() => validateSourceIntegrity(row, 'updated', { ...evolution, originalSha256: sha('fake') }, 'original')).toThrow()
  expect(() => validateSourceIntegrity(row, 'updated', { ...evolution, source: 'wrong' }, 'original')).toThrow()
})
