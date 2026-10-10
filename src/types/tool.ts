export type ToolCategory = 'office' | 'developer'

interface ToolBase {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: ToolCategory
}

export type Tool = ToolBase & (
  | { readonly status: 'planned' }
  | { readonly status: 'preview'; readonly anchor: '#text-statistics' | '#json-formatter' }
)
