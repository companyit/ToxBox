import type { JsonRequest, JsonResult } from '../types/jsonFormatter.ts'

export const JSON_INPUT_LIMIT = 100_000
export const JSON_DEPTH_LIMIT = 100
export const JSON_OUTPUT_LIMIT = 1_000_000
export function checkOutputLength(output: string): boolean {
  return output.length <= JSON_OUTPUT_LIMIT
}

// This resource guard skips string contents; JSON.parse remains the syntax authority.
function exceedsDepth(input: string): boolean {
  let quoted = false
  let escaped = false
  let depth = 0
  for (const character of input) {
    if (quoted) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') quoted = false
    } else if (character === '"') quoted = true
    else if (character === '[' || character === '{') {
      if (++depth > JSON_DEPTH_LIMIT) return true
    } else if (character === ']' || character === '}') depth--
  }
  return false
}

export function processJson({ input, action, indent }: JsonRequest): JsonResult {
  if (input.length > JSON_INPUT_LIMIT) return { status: 'error', code: 'input-too-large' }
  if (/^[\x20\t\r\n]*$/.test(input)) return { status: 'error', code: 'empty' }
  try {
    if (exceedsDepth(input)) return { status: 'error', code: 'too-deep' }
    let value: unknown
    try {
      value = JSON.parse(input)
    } catch (error) {
      return { status: 'error', code: error instanceof SyntaxError ? 'invalid-json' : 'unexpected' }
    }
    if (action === 'validate') return { status: 'validated' }
    // Inspect final values only; native parsing has already rounded finite decimals.
    const stack: unknown[] = [value]
    let unsafe = false
    while (stack.length) {
      const item = stack.pop()
      if (typeof item === 'number') {
        if (!Number.isFinite(item)) return { status: 'error', code: 'non-finite-number' }
        if (Number.isInteger(item) && !Number.isSafeInteger(item)) unsafe = true
      } else if (item !== null && typeof item === 'object') {
        for (const child of Object.values(item)) stack.push(child)
      }
    }
    if (unsafe) return { status: 'error', code: 'unsafe-integer' }
    const output = JSON.stringify(value, null, action === 'format' ? indent : undefined)
    if (typeof output !== 'string') return { status: 'error', code: 'unexpected' }
    return checkOutputLength(output) ? { status: 'converted', output } : { status: 'error', code: 'output-too-large' }
  } catch {
    return { status: 'error', code: 'unexpected' }
  }
}
