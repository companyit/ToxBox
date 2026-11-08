import { expect, test } from 'vitest'
import { legacyToolPath } from '../../src/utils/legacyToolLinks'
const cases = [
 ['text-statistics','/office/text-statistics/'],['text-cleanup','/office/text-cleanup/'],['csv-json','/office/csv-json/'],['pdf-merge','/office/pdf-merge/'],['pdf-split','/office/pdf-split/'],['word-to-pdf','/office/word-to-pdf/'],['images-to-pdf','/office/images-to-pdf/'],['date-calculator','/office/date-calculator/'],
 ['json-formatter','/developer/json-formatter/'],['url-encoder','/developer/url-encoder/'],['totp','/developer/2fa/'],['base64','/developer/base64/'],['timestamp','/developer/timestamp/'],['uuid','/developer/uuid/'],
] as const
test('14个旧首页工具锚点精确对应真实工具页',()=>{
 for(const [hash,path] of cases)expect(legacyToolPath('/','#'+hash)).toBe(path)
 expect(legacyToolPath('/','#%6Ason-formatter')).toBe('/developer/json-formatter/')
})
test('未知/畸形/分区hash及非首页不跳转，不从输入构造外部地址',()=>{
 for(const hash of ['','#','#office-tools','#developer-tools','#privacy','#missing','#JSON-formatter','#%E4%BD','#https://example.invalid/','#//example.invalid/','#json-formatter?input=private','#%2Fdeveloper%2F2fa%2F','totp'])expect(legacyToolPath('/',hash)).toBeUndefined()
 for(const path of ['/office/','/developer/base64/','/missing/','//'])expect(legacyToolPath(path,'#totp')).toBeUndefined()
})
