import { test } from 'vitest'
import inventory from '../migration.json'

// 每个原始标题唯一查找已批准的身份；缺项或重复映射立即使收集失败。
export function migrationTest(source: string) {
  return (title: string, run: () => unknown | Promise<unknown>) => {
    const entries = inventory.filter(row => row.source === source && row.title === title)
    if (entries.length !== 1) throw new Error(`迁移身份缺失或重复：${source} / ${title}`)
    test(`${entries[0]!.id} ${title}`, run)
  }
}
