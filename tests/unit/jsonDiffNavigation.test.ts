import { expect, test } from 'vitest'
import { matchJsonPaths } from '../../src/utils/jsonDiffNavigation'
test('路径按原顺序匹配，空查找包含根路径，不修改原数组', () => {
  const items = [{ path: '' }, { path: '/data/id' }, { path: '/other' }, { path: '/data/name' }]
  expect(matchJsonPaths(items, '')).toEqual([0, 1, 2, 3])
  expect(matchJsonPaths(items, '/data/')).toEqual([1, 3])
  expect(matchJsonPaths(items, 'missing')).toEqual([])
  expect(items.map(item => item.path)).toEqual(['', '/data/id', '/other', '/data/name'])
})
test('查找保留大小写/空白，~0和~1为原文，不解释正则或HTML', () => {
  const items = ['/Name', '/name', '/ name ', '/a~1b/~0key', '/a.*[x]', '/<img>'].map(path => ({ path }))
  expect(matchJsonPaths(items, 'Name')).toEqual([0])
  expect(matchJsonPaths(items, ' name ')).toEqual([2])
  expect(matchJsonPaths(items, '~1')).toEqual([3])
  expect(matchJsonPaths(items, '/a/b')).toEqual([])
  expect(matchJsonPaths(items, '.*')).toEqual([4])
  expect(matchJsonPaths(items, '<img>')).toEqual([5])
})
