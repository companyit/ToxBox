import { migrationTest } from '../helpers/migration'
const test = migrationTest('tests/ssg.test.mjs')
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { validatePages, validateHtml } from '../../scripts/ssg.mjs'
test('SSG output covers eight pages and real 404 with no preview SEO residue',async()=>{
 for(const file of ['index.html','office/index.html','office/text-statistics/index.html','developer/index.html','developer/json-formatter/index.html','developer/url-encoder/index.html','about/index.html','privacy/index.html','404.html']) {
  const html=await fs.readFile('dist-ssg/'+file,'utf8');await validateHtml(html,'dist-ssg')
  assert.match(html,/<meta name="robots" content="noindex,follow">/);assert.doesNotMatch(html,/rel="canonical"/)
  if(file==='404.html')assert.match(html,/页面不存在/)
 }
 const actual=(await fs.readdir('dist-ssg',{recursive:true})).filter(p=>p.endsWith('.html'));assert.equal(actual.length,9)
 for(const file of ['robots.txt','sitemap.xml','entry-server.js'])await assert.rejects(fs.access('dist-ssg/'+file))
})
