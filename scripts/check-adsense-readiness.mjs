import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { pages } from '../src/data/pages.ts'
import { site } from '../src/data/site.ts'
import { toolGuides } from '../src/data/toolGuides.ts'
const root = fileURLToPath(new URL('../', import.meta.url))
const config = JSON.parse(await fs.readFile(path.join(root, 'config/adsense-readiness.json'), 'utf8'))
const seo = JSON.parse(await fs.readFile(path.join(root, 'config/site-release.json'), 'utf8'))
assert.equal(config.schemaVersion, 1)
assert.equal(config.stage, 'preparation')
assert.equal(config.productionOrigin, seo.productionOrigin)
assert.equal(config.contactEmail, site.contactEmail)
assert.equal(config.adScriptEnabled, false, '本轮没有广告启用授权')
assert.equal(config.publisherId, null, '本轮未提供真实发布商 ID')
assert.equal(config.adsTxtConfigured, false)
assert.deepEqual(config.excludedPaths, ['/developer/2fa/', '/office/pdf-merge/', '/office/word-to-pdf/', '/office/pdf-split/', '/office/images-to-pdf/', '/office/image-convert/', '/developer/json-yaml/', '/office/text-diff/', '/office/text-workbench/', '/office/pdf-organizer/'])
assert.deepEqual(config.trustPaths, ['/about/', '/contact/', '/privacy/', '/terms/'])
const expected = [...pages.map(p => p.path.slice(1) + 'index.html'), '404.html'].sort()
const actual = (await fs.readdir(path.join(root, 'dist-ssg'), {recursive:true})).filter(p => p.endsWith('.html')).sort()
assert.deepEqual(actual, expected)
let footerChecks = 0, guideChecks = 0
for (const name of expected) {
 const html = await fs.readFile(path.join(root, 'dist-ssg', name), 'utf8')
 const dom = new JSDOM(html)
 try {
  const doc = dom.window.document
  assert.equal(doc.querySelectorAll('h1').length, 1)
  for (const trustPath of config.trustPaths) {
   assert(doc.querySelector(`footer nav a[href="${trustPath}"]`), `${name} 缺少 ${trustPath} 页脚链接`)
   footerChecks++
  }
  assert.equal(doc.querySelectorAll('script[src*="pagead2.googlesyndication.com"], ins.adsbygoogle, [data-ad-client], meta[name="google-adsense-account"]').length, 0)
  assert(!/ca-pub-\d{16}|pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/.test(html), '禁止广告执行代码')
  const page = pages.find(p => p.path.slice(1)+'index.html' === name)
  if (page && page.routeName in toolGuides) {
   assert(doc.querySelector('.tool-guide'), `${name} 缺少指南`)
   assert.equal(doc.querySelectorAll('.tool-guide h4').length, 2)
   guideChecks++
  }
  if (name === 'contact/index.html') assert(doc.querySelector(`a[href="mailto:${site.contactEmail}"]`))
 } finally { dom.window.close() }
}
for (const directory of ['public','dist-ssg']) {
 try { await fs.access(path.join(root, directory, 'ads.txt')) }
 catch (e) { if(e.code === 'ENOENT') continue; throw e }
 throw Error(`${directory}/ads.txt 不应在未提供发布商 ID 时存在`)
}
for (const name of await fs.readdir(path.join(root, 'dist-ssg/assets'))) {
 if (!name.endsWith('.js')) continue
 const source = await fs.readFile(path.join(root, 'dist-ssg/assets', name), 'utf8')
 assert(!/ca-pub-\d{16}|pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle/.test(source), `${name} 含广告加载代码`)
}
assert.equal(guideChecks, 19)
console.log(JSON.stringify({stage:config.stage, adScriptEnabled:false, htmlPages:expected.length, footerChecks, guideChecks, domainOwnership:'未验证', https:'另见公网检查记录', adsenseApproval:'未验证'}, null, 2))
