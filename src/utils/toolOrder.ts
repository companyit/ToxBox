import type { Tool } from '../types/tool'
// 用途推广顺序为产品判断，不代表搜索量、使用热度或搜索引擎名次。
export const toolPriority: readonly string[] = Object.freeze([
  'image-convert', 'pdf-merge', 'pdf-split', 'images-to-pdf', 'image-crop', 'pdf-organizer',
  'text-statistics', 'text-cleanup', 'text-diff', 'csv-json', 'date-calculator', 'text-workbench', 'word-to-pdf',
  'json-formatter', 'timestamp', 'base64', 'json-yaml', 'url-encoder', 'uuid', 'totp',
])
export function orderTools(catalog: readonly Tool[]): readonly Tool[] {
  const rank = (tool: Tool) => tool.status === 'preview' ? toolPriority.indexOf(tool.routeName) : -1
  return catalog.map((tool, index) => ({tool,index,rank:rank(tool)}))
    .sort((a,b) => (a.rank < 0 ? Infinity : a.rank) - (b.rank < 0 ? Infinity : b.rank) || a.index - b.index)
    .map(item => item.tool)
}
