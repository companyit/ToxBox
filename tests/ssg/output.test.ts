import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/ssg.test.mjs')
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { validatePages, validateHtml } from '../../scripts/ssg.mjs'
test('SSG output covers eight pages and real 404 with no preview SEO residue',async()=>{
 for(const file of ['office/images-to-pdf/index.html','office/date-calculator/index.html','index.html','office/index.html','office/csv-json/index.html','office/text-cleanup/index.html','office/pdf-split/index.html','office/pdf-merge/index.html','office/word-to-pdf/index.html','office/text-statistics/index.html','developer/index.html','developer/json-formatter/index.html','developer/url-encoder/index.html','developer/2fa/index.html','developer/base64/index.html','developer/timestamp/index.html','developer/uuid/index.html','about/index.html','contact/index.html','terms/index.html','privacy/index.html','404.html']) {
  const html=await fs.readFile('dist-ssg/'+file,'utf8');await validateHtml(html,'dist-ssg')
  assert.match(html,/<meta name="robots" content="noindex,follow">/);assert.doesNotMatch(html,/rel="canonical"/)
  if(file==='404.html')assert.match(html,/页面不存在/)
 }
 const notices=await fs.readFile('dist-ssg/third-party-notices.txt')
 const approvedNotices=await fs.readFile(new URL('../../public/third-party-notices.txt',import.meta.url))
 assert.deepEqual(notices,approvedNotices)
 assert.ok(notices.length>0)
 const actual=(await fs.readdir('dist-ssg',{recursive:true})).filter(p=>p.endsWith('.html'));assert.equal(actual.length,27)
 for(const file of ['robots.txt','sitemap.xml','entry-server.js'])await assert.rejects(fs.access('dist-ssg/'+file))
})
