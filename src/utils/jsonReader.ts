export type JsonReadCode = 'invalid-json' | 'depth' | 'nodes' | 'unicode' | 'duplicate-key'
export const JSON_TABLE_DEPTH = 30
export const JSON_TABLE_NODES = 50_000
export class JsonFailure extends Error {
  constructor(readonly code: JsonReadCode, readonly offset?: number) { super(code) }
}
export class JsonNumber { constructor(readonly source: string) {} }
export type JsonValue = string | boolean | null | JsonNumber | JsonValue[] | Map<string, JsonValue>
const whitespace = (ch: string) => ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n'

export function validJsonUnicode(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 0) return false
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(++i)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false
    } else if (code >= 0xdc00 && code <= 0xdfff) return false
  }
  return true
}

export class JsonReader {
  private index = 0
  private nodes = 0
  private readonly numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
  constructor(private readonly source: string) {}
  private fail(code: JsonReadCode = 'invalid-json'): never { throw new JsonFailure(code, this.index) }
  private space() { while (this.index < this.source.length && whitespace(this.source[this.index]!)) this.index++ }
  private node() { if (++this.nodes > JSON_TABLE_NODES) this.fail('nodes') }
  private string(): string {
    const start = this.index++
    while (this.index < this.source.length) {
      const ch = this.source[this.index++]
      if (ch === '\\') this.index++
      else if (ch === '"') {
        let value: string
        try { value = JSON.parse(this.source.slice(start, this.index)) as string }
        catch { throw new JsonFailure('invalid-json', start) }
        if (!validJsonUnicode(value)) throw new JsonFailure('unicode', start)
        return value
      }
    }
    return this.fail()
  }
  private value(depth: number): JsonValue {
    this.space(); this.node()
    const ch = this.source[this.index]
    if (ch === '"') return this.string()
    if (ch === '{' || ch === '[') {
      if (depth >= JSON_TABLE_DEPTH) this.fail('depth')
      this.index++; this.space()
      if (ch === '[') {
        const values: JsonValue[] = []
        if (this.source[this.index] === ']') { this.index++; return values }
        while (true) {
          values.push(this.value(depth + 1)); this.space()
          if (this.source[this.index] === ']') { this.index++; return values }
          if (this.source[this.index] !== ',') this.fail()
          this.index++
        }
      }
      const values = new Map<string, JsonValue>()
      if (this.source[this.index] === '}') { this.index++; return values }
      while (true) {
        this.space(); this.node()
        if (this.source[this.index] !== '"') this.fail()
        const offset = this.index, key = this.string()
        if (values.has(key)) throw new JsonFailure('duplicate-key', offset)
        this.space()
        if (this.source[this.index] !== ':') this.fail()
        this.index++
        values.set(key, this.value(depth + 1)); this.space()
        if (this.source[this.index] === '}') { this.index++; return values }
        if (this.source[this.index] !== ',') this.fail()
        this.index++
      }
    }
    for (const [token, value] of [['true', true], ['false', false], ['null', null]] as const) {
      if (this.source.startsWith(token, this.index)) { this.index += token.length; return value }
    }
    this.numberPattern.lastIndex = this.index
    const number = this.numberPattern.exec(this.source)
    if (number) { this.index += number[0].length; return new JsonNumber(number[0]) }
    return this.fail()
  }
  read(): JsonValue {
    const value = this.value(0); this.space()
    if (this.index !== this.source.length) this.fail()
    return value
  }
}

export function encodeJsonValue(value: JsonValue): string {
  if (value instanceof JsonNumber) return value.source
  if (value instanceof Map) return '{' + Array.from(value, ([key, item]) => JSON.stringify(key) + ':' + encodeJsonValue(item)).join(',') + '}'
  if (Array.isArray(value)) return '[' + value.map(encodeJsonValue).join(',') + ']'
  return JSON.stringify(value)
}
