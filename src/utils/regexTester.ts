export const regexFlags = ['i', 'm', 's', 'u'] as const
export type RegexFlag = typeof regexFlags[number]

export interface RegexRequest {
  pattern: string
  sample: string
  flags: RegexFlag[]
}

interface Capture {
  label: string
  value: string | undefined
}

interface RegexMatch {
  start: number
  end: number
  text: string
  captures: Capture[]
}

export type RegexResult = { matches: RegexMatch[]; limited: boolean } | { error: string }

export function validateRegexInput({ pattern, sample }: RegexRequest): string | undefined {
  if (!pattern) return '请输入正则表达式。'
  if (pattern.length > 1_000) return '模式最多允许 1,000 个码元。'
  if (sample.length > 50_000) return '样本最多允许 50,000 个码元。'
}

export function testRegex(request: RegexRequest): RegexResult {
  const error = validateRegexInput(request)
  if (error) return { error }

  const { pattern, sample, flags } = request
  let regex: RegExp
  try {
    regex = new RegExp(pattern, 'g' + flags.join(''))
  } catch {
    return { error: '正则表达式语法无效，请检查模式和标志。' }
  }

  const outputLimit = '匹配文本或捕获组超出结果上限，请缩小匹配范围。'
  const matches: RegexMatch[] = []
  let units = 0
  let entries = 0
  while (regex.lastIndex <= sample.length) {
    const match = regex.exec(sample)
    if (!match) break
    if (matches.length === 500) return { matches, limited: true }

    const named = Object.entries(match.groups ?? {})
    entries += match.length + named.length
    units += match.reduce((sum, value) => sum + (value?.length ?? 0), 0)
    for (const [name, value] of named) units += name.length + (value?.length ?? 0)
    if (entries > 20_000 || units > 200_000) return { error: outputLimit }

    const captures: Capture[] = match.slice(1).map((value, index) => ({ label: `组 ${index + 1}`, value }))
    for (const [name, value] of named) captures.push({ label: name, value })
    const end = regex.lastIndex
    matches.push({ start: match.index, end, text: match[0], captures })

    if (end === match.index) {
      regex.lastIndex += regex.unicode && (sample.codePointAt(end) ?? 0) > 0xffff ? 2 : 1
    }
  }
  return { matches, limited: false }
}
