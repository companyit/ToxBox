export type JsonAction = 'validate' | 'format' | 'minify'
export type JsonIndent = 2 | 4
export interface JsonRequest { input: string; action: JsonAction; indent: JsonIndent }
export type JsonErrorCode = 'empty' | 'input-too-large' | 'too-deep' | 'invalid-json' | 'unsafe-integer' | 'non-finite-number' | 'output-too-large' | 'unexpected'
export type JsonResult = { status: 'validated' } | { status: 'converted'; output: string } | { status: 'error'; code: JsonErrorCode }
