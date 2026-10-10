import type { UrlRequest, UrlResult } from '../types/urlEncoder.ts'

export const URL_INPUT_LIMIT = 100_000
export function processUrl({ input, mode, action }: UrlRequest): UrlResult {
  if (input.length > URL_INPUT_LIMIT) return { status: 'error', code: 'input-too-large' }
  if (input === '') return { status: 'empty' }
  try {
    const transform = action === 'encode'
      ? mode === 'component' ? encodeURIComponent : encodeURI
      : mode === 'component' ? decodeURIComponent : decodeURI
    return { status: 'ok', output: transform(input) }
  } catch (error) {
    return { status: 'error', code: error instanceof URIError
      ? action === 'encode' ? 'invalid-unicode' : 'invalid-encoding'
      : 'unexpected' }
  }
}
