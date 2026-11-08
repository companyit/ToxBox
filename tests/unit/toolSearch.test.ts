import { test, expect } from 'vitest'
import { searchTools } from '../../src/utils/toolSearch'
import type { Tool } from '../../src/types/tool'
const tools: readonly Tool[] = [
 {id:'base64',name:'Base64 编解码',description:'UTF-8 本地转换',category:'developer',status:'preview',routeName:'base64'},
 {id:'next',name:'后续工具',description:'UTF-8',category:'office',status:'planned'},
]
test('名称简介、大小写、空白、不变性与 planned 排除', () => {
 expect(searchTools(tools,' BASE64 ')).toEqual([tools[0]])
 expect(searchTools(tools,'utf-8')).toEqual([tools[0]])
 expect(searchTools(tools,'  ')).toEqual([tools[0]])
 expect(searchTools(tools,'不存在')).toEqual([])
 expect(tools).toHaveLength(2)
 expect(()=>searchTools(tools,'a'.repeat(101))).toThrow()
})
