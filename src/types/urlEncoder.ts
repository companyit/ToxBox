export type UrlMode = 'component' | 'uri'
export type UrlAction = 'encode' | 'decode'
export interface UrlRequest { input: string; mode: UrlMode; action: UrlAction }
export type UrlErrorCode = 'input-too-large' | 'invalid-unicode' | 'invalid-encoding' | 'unexpected'
export type UrlResult = { status: 'empty' } | { status: 'ok'; output: string } | { status: 'error'; code: UrlErrorCode }
