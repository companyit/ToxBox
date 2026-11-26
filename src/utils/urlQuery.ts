export type QueryInput = 'url' | 'query'

interface QueryParameter {
  name: string
  value: string | null
}

type QueryResult = { parameters: QueryParameter[] } | { error: string }

function extractQuery(source: string): string | undefined {
  const address = source.trimStart()
  if (!/^https?:\/\/[^/\\?#\s]/i.test(address) || /[\t\r\n]/.test(address)) return
  try {
    new URL(address)
  } catch {
    return
  }
  const beforeFragment = address.split('#', 1)[0]!
  const start = beforeFragment.indexOf('?')
  return start === -1 ? '' : beforeFragment.slice(start + 1)
}

export function parseUrlQuery(source: string, input: QueryInput, formMode: boolean): QueryResult {
  if (source.length > 20_000) return { error: '输入最多允许 20,000 个码元。' }

  const query = input === 'url' ? extractQuery(source) : source.replace(/^\?/, '')
  if (query === undefined) return { error: '请输入有效的绝对 HTTP 或 HTTPS 地址。' }

  const segments = query.split('&').filter(Boolean)
  if (segments.length > 500) return { error: '最多允许 500 条参数。' }

  const decode = (part: string) => decodeURIComponent(formMode ? part.replaceAll('+', ' ') : part)
  const parameters: QueryParameter[] = []
  for (const segment of segments) {
    const separator = segment.indexOf('=')
    try {
      parameters.push(separator === -1
        ? { name: decode(segment), value: null }
        : { name: decode(segment.slice(0, separator)), value: decode(segment.slice(separator + 1)) })
    } catch {
      return { error: `第 ${parameters.length + 1} 项包含无效的百分号转义或 UTF-8 编码。` }
    }
  }
  return { parameters }
}
