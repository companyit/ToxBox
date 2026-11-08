import type { Tool } from '@/types/tool'
export function searchTools(tools: readonly Tool[], query: string): readonly Tool[] {
 if (query.length > 100) throw new Error('搜索内容超过 100 个 UTF-16 码元，请缩短后重试。')
 const term = query.trim().toLowerCase()
 return tools.filter(tool => tool.status === 'preview' && (!term || `${tool.name}\n${tool.description}`.toLowerCase().includes(term)))
}
