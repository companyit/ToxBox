import { test, expect } from 'vitest'
import { generateUuids } from '../../src/utils/uuid'
test('固定随机字节设置版本和 variant，不依赖随机碰撞概率', () => {
 expect(generateUuids('1', bytes => bytes.fill(0))).toBe('00000000-0000-4000-8000-000000000000')
 expect(generateUuids('1', bytes => bytes.fill(255))).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
 expect(generateUuids('100', bytes => bytes.fill(0)).split('\n')).toHaveLength(100)
})
test('数量和安全随机失败', () => {
 for(const n of ['', '0','101','1.0','1e2','-1','1000']) expect(()=>generateUuids(n, bytes => bytes.fill(0))).toThrow()
 expect(()=>generateUuids('2',()=>{throw Error('unavailable')})).toThrow()
})
