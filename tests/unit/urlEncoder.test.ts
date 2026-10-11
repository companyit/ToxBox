import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/urlEncoder.test.ts')
import assert from 'node:assert/strict'
import { processUrl } from '../../src/utils/urlEncoder.ts'
import type { UrlMode, UrlAction } from '../../src/types/urlEncoder.ts'
const modes: UrlMode[] = ['component', 'uri']
const run = (input: string, action: UrlAction, mode: UrlMode = 'component') => processUrl({input, action, mode})
const out = (input: string, action: UrlAction, expected: string, mode: UrlMode = 'component') => assert.deepEqual(run(input,action,mode),{status:'ok',output:expected})
const error = (input: string, action: UrlAction, code: string, mode: UrlMode = 'component') => assert.deepEqual(run(input,action,mode),{status:'error',code})
const reserved=';/?:@&=+$,#', escaped='%3B%2F%3F%3A%40%26%3D%2B%24%2C%23'
test('U01 empty is not an error and avoids native APIs',()=>{
 const names=['encodeURIComponent','encodeURI','decodeURIComponent','decodeURI'] as const
 const saved=names.map(n=>globalThis[n]);try {for(const name of names)globalThis[name]=()=>{throw new Error('must not call')};for(const mode of modes)for(const action of ['encode','decode'] as const)assert.deepEqual(run('',action,mode),{status:'empty'})}finally {names.forEach((n,i)=>{Reflect.set(globalThis,n,saved[i]!)})}
})
test('U02 unescaped set',()=>{for(const m of modes)out("AZaz09-_.!~*'()",'encode',"AZaz09-_.!~*'()",m)})
test('U03 Chinese',()=>{for(const m of modes)out('你好','encode','%E4%BD%A0%E5%A5%BD',m)})
test('U04 Emoji',()=>{for(const m of modes)out('😀','encode','%F0%9F%98%80',m)})
test('U05 component reserved',()=>out(reserved,'encode',escaped))
test('U06 URI reserved',()=>out(reserved,'encode',reserved,'uri'))
test('U07 brackets',()=>{for(const m of modes)out('[]','encode','%5B%5D',m)})
test('U08 reserved decoding',()=>{out(escaped,'decode',reserved);out(escaped,'decode',escaped,'uri')})
test('U09 preserved escape case',()=>{out('%2f%3f%23%41','decode','/?#A');out('%2f%3f%23%41','decode','%2f%3f%23A','uri')})
test('U10 space and plus encode',()=>{out('a b+c','encode','a%20b%2Bc');out('a b+c','encode','a%20b+c','uri')})
test('U11 whitespace is content',()=>{for(const m of modes)out(' \t\n','encode','%20%09%0A',m)})
test('U12 plus never means form space',()=>{out('a+b%20c%2Bd','decode','a+b c+d');out('a+b%20c%2Bd','decode','a+b c%2Bd','uri')})
test('U13 invalid percent sequences',()=>{for(const s of ['%','%2','%GG','a%4Zb','%u4F60'])for(const m of modes)error(s,'decode','invalid-encoding',m)})
test('U14 truncated UTF8',()=>{for(const s of ['%E4%BD','%F0%9F%98','%E4x%BD%A0'])for(const m of modes)error(s,'decode','invalid-encoding',m)})
test('U15 invalid UTF8',()=>{for(const s of ['%80','%C0%AF','%E0%80%AF','%F4%90%80%80','%FF'])for(const m of modes)error(s,'decode','invalid-encoding',m)})
test('U16 encoded surrogate fails',()=>{for(const s of ['%ED%A0%80','%ED%B0%80'])for(const m of modes)error(s,'decode','invalid-encoding',m)})
test('U17 lower-case escapes',()=>{for(const m of modes)out('%e4%bd%a0%f0%9f%98%80','decode','你😀',m)})
test('U18 percent once',()=>{for(const m of modes)out('%25','decode','%',m)})
test('U19 existing escape is encoded',()=>{for(const m of modes)out('%2F','encode','%252F',m)})
test('U20 repeated decode requires manual input',()=>{for(const m of modes)out('%252F','decode','%2F',m);out('%2F','decode','/');out('%2F','decode','%2F','uri')})
test('U21 repeated encode',()=>{for(const m of modes){out('%','encode','%25',m);out('%25','encode','%2525',m);out('%','encode','%25',m)}})
test('U22 raw URI is not parsed or validated',()=>{for(const m of modes)out('https://example.com/路径?q=a+b#片段','decode','https://example.com/路径?q=a+b#片段',m)})
test('U23 lone surrogate encode fails',()=>{for(const s of ['\uD800','\uDC00','a\uD800b','\uD800\uD800','\uDC00\uD800'])for(const m of modes)error(s,'encode','invalid-unicode',m)})
test('U24 raw surrogate decode is native passthrough',()=>{for(const m of modes){out('\uD800','decode','\uD800',m);out('\uDC00','decode','\uDC00',m);out('x%41\uD800','decode','xA\uD800',m)}})
test('U25 HTML remains a string',()=>{const s='%3Cscript%3Ealert(1)%3C%2Fscript%3E';out(s,'decode','<script>alert(1)</script>');out(s,'decode','<script>alert(1)<%2Fscript>','uri')})
test('U26 ASCII size boundary avoids API on excess',()=>{for(const m of modes)for(const a of ['encode','decode'] as const){out('a'.repeat(100000),a,'a'.repeat(100000),m);error('a'.repeat(100001),a,'input-too-large',m)}const old=globalThis.encodeURIComponent;try{globalThis.encodeURIComponent=()=>{throw new Error('must not call')};error('a'.repeat(100001),'encode','input-too-large')}finally{globalThis.encodeURIComponent=old}})
test('U27 Emoji code units and maximum expansion',()=>{for(const m of modes){out('😀'.repeat(50000),'encode','%F0%9F%98%80'.repeat(50000),m);error('😀'.repeat(50000)+'a','encode','input-too-large',m);out('你'.repeat(100000),'encode','%E4%BD%A0'.repeat(100000),m)}})
test('U28 exact decode size',()=>{for(const m of modes){out('%41'.repeat(33333)+'a','decode','A'.repeat(33333)+'a',m);error('%41'.repeat(33333)+'aa','decode','input-too-large',m)}})
test('U29 unexpected and URIError sanitized then recovered',()=>{
 for(const [name,action,mode] of [['encodeURIComponent','encode','component'],['encodeURI','encode','uri'],['decodeURIComponent','decode','component'],['decodeURI','decode','uri']] as const){const saved=globalThis[name];try{globalThis[name]=()=>{throw new Error('PRIVATE')};error('abc',action,'unexpected',mode);globalThis[name]=()=>{throw new URIError('PRIVATE')};error('abc',action,action==='encode'?'invalid-unicode':'invalid-encoding',mode)}finally{Reflect.set(globalThis,name,saved)}out('abc',action,'abc',mode)}
})
test('U30 no Unicode normalization, controls, no recursive repair',()=>{for(const m of modes){out('e\u0301','encode','e%CC%81',m);out('é','encode','%C3%A9',m);out('%0D%0A%00','decode','\r\n\0',m);out('%252G','decode','%2G',m);error('%2G','decode','invalid-encoding',m)}})
