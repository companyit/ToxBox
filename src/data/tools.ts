import type { Tool } from '@/types/tool'

export const tools: readonly Tool[] = [
  {
    id: 'text-stats',
    name: '文本统计',
    description: '了解文本的字符数量与行数，让日常内容整理更轻松。',
    category: 'office',
    status: 'preview',
    routeName: 'text-statistics',
  },
  {
    id: 'json-formatter',
    name: 'JSON 格式化与校验',
    description: '整理 JSON 结构、检查格式，让数据更易阅读。',
    category: 'developer',
    status: 'preview',
    routeName: 'json-formatter',
  },
  {
    id: 'url-codec',
    name: 'URL 编解码',
    description: '按 URI 组件或完整 URI 模式，手动编码与解码文本。',
    category: 'developer',
    status: 'preview',
    routeName: 'url-encoder',
  },
]
