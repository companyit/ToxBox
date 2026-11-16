import { validateAdSenseDocument } from './adsense-ownership.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { pages } from '../src/data/pages.ts'
import { site } from '../src/data/site.ts'
import { toolGuides } from '../src/data/toolGuides.ts'
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)))
const config = JSON.parse(await fs.readFile(path.join(root, 'config/adsense-readiness.json'), 'utf8'))
const seo = JSON.parse(await fs.readFile(path.join(root, 'config/site-release.json'), 'utf8'))
assert.equal(config.schemaVersion, 1)
assert.equal(config.stage, 'integration')
assert.equal(config.productionOrigin, seo.productionOrigin)
assert.equal(config.contactEmail, site.contactEmail)
assert.equal(config.adScriptEnabled, true, '本轮已授权启用白名单广告脚本')
assert.equal(config.publisherId, 'ca-pub-2420716265318225')
assert.equal(config.verificationMethod, 'meta-home')
const mode = process.argv[2] ?? 'preview'
assert(['preview', 'production'].includes(mode), '模式仅支持preview或production')
const output = path.resolve(root, process.argv[3] ?? 'dist-ssg')
assert(output.startsWith(root + path.sep), '仅审计仓库内产物')
assert.equal(config.adsTxtConfigured, false)
assert.deepEqual(config.excludedPaths, ['/developer/json-diff/', '/office/file-diff/', '/developer/2fa/', '/office/pdf-merge/', '/office/word-to-pdf/', '/office/pdf-split/', '/office/images-to-pdf/', '/office/image-convert/', '/developer/json-yaml/', '/office/text-diff/', '/office/text-workbench/', '/office/pdf-organizer/', '/office/image-crop/'])
assert.deepEqual(config.trustPaths, ['/about/', '/contact/', '/privacy/', '/terms/'])
const expected = [...pages.map(p => p.path.slice(1) + 'index.html'), '404.html'].sort()
const actual = (await fs.readdir(path.join(output), {recursive:true})).filter(p => p.endsWith('.html')).sort()
assert.deepEqual(actual, expected)
let footerChecks = 0, guideChecks = 0
for (const name of expected) {
 const html = await fs.readFile(path.join(output, name), 'utf8')
 const dom = new JSDOM(html)
 try {
  const doc = dom.window.document
  assert.equal(doc.querySelectorAll('h1').length, 1)
  for (const trustPath of config.trustPaths) {
   assert(doc.querySelector(`footer nav a[href="${trustPath}"]`), `${name} 缺少 ${trustPath} 页脚链接`)
   footerChecks++
  }
  validateAdSenseDocument(doc, { mode, isHome: name === 'index.html', pagePath: name === 'index.html' ? '/' : '/' + name.replace(/index\.html$/, '') })
  const page = pages.find(p => p.path.slice(1)+'index.html' === name)
  if (page && page.routeName in toolGuides) {
   assert(doc.querySelector('.tool-guide'), `${name} 缺少指南`)
   assert.equal(doc.querySelectorAll('.tool-guide h4').length, 2)
   guideChecks++
  }
  if (name === 'contact/index.html') assert(doc.querySelector(`a[href="mailto:${site.contactEmail}"]`))
 } finally { dom.window.close() }
}
for (const directory of [path.join(root, 'public'), output]) {
 try { await fs.access(path.join(directory, 'ads.txt')) }
 catch (e) { if(e.code === 'ENOENT') continue; throw e }
 throw Error(`${directory}/ads.txt 未获授权生成`)
}
for (const name of await fs.readdir(path.join(output, 'assets'))) {
 if (!name.endsWith('.js')) continue
 const source = await fs.readFile(path.join(output, 'assets', name), 'utf8')
 assert(!/adsbygoogle\s*\.\s*push/.test(source), `${name} 含广告加载代码`)
 for (const id of source.match(/ca-pub-\d{16}/g) ?? []) assert.equal(id, config.publisherId, '包含未批准发布商ID')
}
assert.equal(guideChecks, 22)
console.log(JSON.stringify({stage:config.stage, mode, verificationMethod:config.verificationMethod, adScriptEnabled:config.adScriptEnabled, adScriptPages:mode === 'production' ? config.allowedPaths : [], htmlPages:expected.length, footerChecks, guideChecks, domainOwnership:'未验证', https:'另见公网检查记录', adsenseApproval:'未验证'}, null, 2))
