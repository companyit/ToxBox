import { build } from 'vite'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createPageHead } from '../src/utils/seo.ts'
import { pages as approvedPages, notFoundPage } from '../src/data/pages.ts'
import { resolveSeoEnvironment } from '../src/utils/seoEnvironment.ts'
import { assertSafePath, readSafeFile, digestDirectory, repositoryRoot, createSeoEnvelope } from './release-candidate.mjs'
const root = process.cwd(), work = path.join(root, '.ssg-build'), output = path.join(root, 'dist-ssg')
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function validatePages(pages) {
  const names = new Set(), paths = new Set()
  for (const p of pages) {
    if (!/^\/(?:[a-z0-9-]+\/)*$/.test(p.path) || names.has(p.routeName) || paths.has(p.path)) throw Error('页面名称/路径重复或非法')
    if (!p.title || !p.description) throw Error('页面元数据缺失')
    names.add(p.routeName); paths.add(p.path)
  }
  if (pages.length !== 8) throw Error('正式页面数量不符合已批准清单')
}
export async function validateHtml(html, directory) {
  if ((html.match(/<h1(?:\s|>)/g) ?? []).length !== 1 || (html.match(/<main(?:\s|>)/g) ?? []).length !== 1 || !html.includes('data-render-mode="ssg"')) throw Error('静态正文结构缺失')
  if ((html.match(/<title>/g) ?? []).length !== 1 || (html.match(/<meta name="description" content="[^"]+"/g) ?? []).length !== 1) throw Error('静态SEO元数据缺失或重复')
  for (const [, resource] of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
    if (!resource.startsWith('/assets/') && resource !== '/favicon.ico') continue
    await fs.access(path.join(directory, resource.slice(1)))
  }
}
async function generateLegacyPreview() {
  // Validate before touching a previous default preview output.
  if (process.env.SSG_SEO_MODE && process.env.SSG_SEO_MODE !== 'preview') throw Error('默认入口仅支持preview')
  if (process.env.WORKDEV_RELEASE_BUILD_ID || process.env.WORKDEV_CANDIDATE_RECEIPT || process.env.WORKDEV_CANDIDATE_RECEIPT_SHA) throw Error('隔离候选不得使用默认生成入口')
  const envelope = await createSeoEnvelope({ mode: 'preview' })
  if (process.env.WORKDEV_SEO_MODE && process.env.WORKDEV_SEO_MODE !== 'preview') throw Error('默认生成模式冲突')
  if (process.env.WORKDEV_SITE_ORIGIN !== undefined) throw Error('preview不得携带production origin')
  // 本次失败不能留下可被误认为成功的旧候选产物。
  await fs.rm(output, { recursive: true, force: true })
  await fs.rm(work, { recursive: true, force: true })
  const timer = setTimeout(() => { console.error('SSG整体超时'); process.exit(1) }, 300000)
  try {
    if (process.env.SSG_SEO_MODE && process.env.SSG_SEO_MODE !== 'preview') throw Error('当前仅批准preview产物，正式SEO构建须另行审批')
    const client = path.join(work, 'client')
    const define = { __WORKDEV_SEO_CONFIG__: JSON.stringify(envelope) }
    await build({ define, build: { outDir: client, ssrManifest: true, emptyOutDir: true } })
    await build({ define, build: { outDir: path.join(work, 'server'), ssr: 'src/entry-server.ts', emptyOutDir: true } })
    const { render, pages, routeCatalog } = await import(pathToFileURL(path.join(work, 'server/entry-server.js')))
    validatePages(pages)
    if (routeCatalog.length !== pages.length || routeCatalog.some(route => !pages.some(page => page.path === route.path && page.routeName === route.routeName))) throw Error('路由与静态页面清单双向校验失败')
    const manifest = JSON.parse(await fs.readFile(path.join(client, '.vite/ssr-manifest.json'), 'utf8'))
    for (const resource of new Set(Object.values(manifest).flat())) {
      if (!resource.startsWith('/assets/')) throw Error('manifest资源路径无效')
      await fs.access(path.join(client, resource.slice(1)))
    }
    const template = await fs.readFile(path.join(client, 'index.html'), 'utf8')
    const candidate = path.join(work, 'candidate')
    await fs.cp(client, candidate, { recursive: true })
    await fs.rm(path.join(candidate, '.vite'), { recursive: true, force: true })
    const generated = []
    for (const page of [...pages, { path: '/__ssg_not_found__/', routeName: 'not-found' }]) {
      let pageTimer
      const result = await Promise.race([render(page.path), new Promise((_, reject) => { pageTimer = setTimeout(() => reject(Error('页面渲染超时')), 30000) })]).finally(() => clearTimeout(pageTimer))
      const { head, body, modules } = result
      const styles = [...new Set(modules.flatMap(id => manifest[id] ?? []).filter(file => file.endsWith('.css')))]
      let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(head.title)}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(head.description)}">`)
        .replace('<div id="app"></div>', `<div id="app" data-render-mode="ssg">${body}</div>`)
        .replace('</head>', styles.filter(file => !template.includes(`href="${file}"`)).map(file => `<link rel="stylesheet" href="${file}">`).join('') + '</head>')
      if (!html.includes(escape(head.title)) || !html.includes(escape(head.description)) || html.includes('rel="canonical"')) throw Error('静态head不一致')
      await validateHtml(html, candidate)
      const filename = page.routeName === 'not-found' ? '404.html' : page.path.slice(1) + 'index.html'
      const destination = path.join(candidate, filename)
      await fs.mkdir(path.dirname(destination), { recursive: true })
      await fs.writeFile(destination, html)
      generated.push(filename)
    }
    if (new Set(generated).size !== 9) throw Error('页面遗漏或输出重复')
    await fs.rename(candidate, output)
    console.log('SSG成功：' + generated.join(', '))
  } finally { clearTimeout(timer) }
}

export function contentTypeFor(filename) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' }
  const result = types[path.extname(filename)]
  if (!result) throw Error('不允许的资源扩展名/MIME')
  return result
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const xmlEscape = value => escape(value)

function environmentFor(envelope) {
  if (!envelope || typeof envelope !== 'object' || Object.keys(envelope).sort().join(',') !== 'approvedConfig,raw') throw Error('SEO信封无效')
  return resolveSeoEnvironment(envelope.raw, envelope.approvedConfig)
}

function manifestResources(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw Error('SSR manifest无效')
  const resources = new Set()
  for (const list of Object.values(manifest)) {
    if (!Array.isArray(list)) throw Error('SSR manifest资源列表无效')
    for (const resource of list) {
      if (typeof resource !== 'string' || !/^\/assets\/[A-Za-z0-9_.-]+\.(?:js|css|svg|png|jpg|webp|woff2?)$/.test(resource)) throw Error('SSR manifest含非法资源路径')
      resources.add(resource)
    }
  }
  return resources
}

/** Read-only semantic validation; neither builds nor changes output. */
export async function validateCandidateOutput(directory, envelope, manifestPath) {
  const environment = environmentFor(envelope)
  await assertSafePath(directory, { directory: true })
  const manifestBytes = await readSafeFile(manifestPath)
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const resources = manifestResources(manifest)
  const expectedHtml = [...approvedPages.map(p => p.path.slice(1) + 'index.html'), '404.html'].sort()
  const files = await digestDirectory(directory)
  if (!equal(Object.keys(files).filter(x => x.endsWith('.html')).sort(), expectedHtml)) throw Error('候选9HTML清单不一致')
  const production = environment.mode === 'production'
  const allowedSeo = production ? ['robots.txt', 'sitemap.xml'] : []
  const referenced = new Set()
  const { JSDOM } = await import('jsdom')
  for (const page of [...approvedPages, notFoundPage]) {
    const filename = page.routeName === 'not-found' ? '404.html' : page.path.slice(1) + 'index.html'
    const html = (await readSafeFile(path.join(directory, filename))).toString('utf8')
    await validateHtml(html, directory)
    const dom = new JSDOM(html) // No runScripts/resources: no code execution or remote loading.
    try {
      const doc = dom.window.document
      const head = createPageHead(page, environment)
      const single = (selector, attribute, expected) => {
        const nodes = doc.head.querySelectorAll(selector)
        if (expected === undefined) { if (nodes.length) throw Error('出现不允许的SEO标签'); return }
        if (nodes.length !== 1 || (attribute ? nodes[0].getAttribute(attribute) : nodes[0].textContent) !== expected) throw Error('SEO标签缺失、重复或值不符')
      }
      single('title', null, head.title)
      single('meta[name="description"]', 'content', head.description)
      single('meta[name="robots"]', 'content', head.robots)
      single('link[rel="canonical"]', 'href', head.canonical)
      for (const property of ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:locale']) single(`meta[property="${property}"]`, 'content', head.openGraph?.[property])
      if (doc.head.querySelector('meta[property="og:image"]')) throw Error('分享图不在批准范围')
      if (doc.querySelectorAll('main').length !== 1 || doc.querySelectorAll('h1').length !== 1 || doc.documentElement.lang !== 'zh-CN') throw Error('静态正文结构无效')
      for (const node of doc.querySelectorAll('[src], link[href]')) {
        const resource = node.getAttribute('src') ?? node.getAttribute('href')
        if (node.matches('link[rel="canonical"]')) continue
        if (!resource || resource.startsWith('#')) continue
        if (resource !== '/favicon.ico' && !/^\/assets\/[A-Za-z0-9_.-]+\.(?:js|css|svg|png|jpg|webp|woff2?)$/.test(resource)) throw Error('静态资源URL未批准')
        const name = resource.slice(1)
        if (!files[name] || !files[name].size) throw Error('静态资源缺失或为空')
        contentTypeFor(name)
        referenced.add(name)
      }
    } finally { dom.window.close() }
  }
  for (const resource of resources) {
    if (!files[resource.slice(1)]) throw Error('manifest引用缺失资源')
    referenced.add(resource.slice(1))
  }
  for (const name of Object.keys(files)) {
    if (!expectedHtml.includes(name) && !allowedSeo.includes(name) && !referenced.has(name)) throw Error('公开输出含未批准文件或未引用资源')
    contentTypeFor(name)
  }
  const canonicalUrls = approvedPages.map(p => createPageHead(p, environment).canonical).filter(Boolean)
  if (production) {
    if (canonicalUrls.length !== 8 || new Set(canonicalUrls).size !== 8) throw Error('生产canonical集合不一致')
    const robots = (await readSafeFile(path.join(directory, 'robots.txt'))).toString('utf8')
    if (robots !== `User-agent: *\nAllow: /\nSitemap: ${environment.approvedOrigin}/sitemap.xml\n`) throw Error('robots合同不符')
    const xml = (await readSafeFile(path.join(directory, 'sitemap.xml'))).toString('utf8')
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('站点地图禁止DTD/实体声明')
    const dom = new JSDOM(xml, { contentType: 'text/xml' })
    try {
      const doc = dom.window.document
      if (doc.documentElement.localName !== 'urlset' || doc.documentElement.namespaceURI !== 'http://www.sitemaps.org/schemas/sitemap/0.9') throw Error('sitemap命名空间不符')
      const children = [...doc.documentElement.children]
      if (children.length !== 8 || children.some(node => node.localName !== 'url' || node.children.length !== 1 || node.firstElementChild?.localName !== 'loc')) throw Error('sitemap结构或条目不符')
      const actual = children.map(node => node.firstElementChild.textContent)
      if (!equal([...actual].sort(), [...canonicalUrls].sort()) || new Set(actual).size !== 8) throw Error('sitemap不等于批准canonical集合')
    } finally { dom.window.close() }
  } else if (files['robots.txt'] || files['sitemap.xml']) throw Error('preview禁止生产SEO产物')
  return { htmlFiles: expectedHtml, mode: environment.mode, canonicalUrls, publicFiles: Object.keys(files), manifestSha256: sha256(manifestBytes) }
}

/** Only a locked, isolated candidate context can invoke this write path. */
export async function generateCandidate({ candidateRoot, envelope }) {
  const id = path.basename(candidateRoot)
  const expected = path.join(repositoryRoot, '.ci/release-01/candidates', id)
  if (candidateRoot !== expected || process.env.WORKDEV_RELEASE_BUILD_ID !== id) throw Error('缺少受控候选构建上下文')
  await assertSafePath(candidateRoot, { directory: true })
  const lock = JSON.parse((await readSafeFile(path.join(candidateRoot, 'writer.lock'))).toString('utf8'))
  if (lock.pid !== process.pid || lock.candidateId !== id) throw Error('候选单写者不一致')
  const environment = environmentFor(envelope)
  const workRoot = path.join(candidateRoot, 'work')
  const staging = path.join(candidateRoot, 'staging/dist-ssg')
  const metadata = path.join(candidateRoot, 'metadata')
  await assertSafePath(workRoot, { directory: true })
  await assertSafePath(staging, { directory: true })
  await assertSafePath(metadata, { directory: true })
  const define = { __WORKDEV_SEO_CONFIG__: JSON.stringify(envelope) }
  const client = path.join(workRoot, 'client')
  await build({ root: repositoryRoot, define, build: { outDir: client, ssrManifest: true, sourcemap: false, emptyOutDir: true } })
  await build({ root: repositoryRoot, define, build: { outDir: path.join(workRoot, 'server'), ssr: 'src/entry-server.ts', sourcemap: false, emptyOutDir: true } })
  const manifestPath = path.join(metadata, 'ssr-manifest.json')
  const manifestBytes = await readSafeFile(path.join(client, '.vite/ssr-manifest.json'))
  await fs.writeFile(manifestPath, manifestBytes, { flag: 'wx', mode: 0o600 })
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const resources = manifestResources(manifest)
  const { render, pages, routeCatalog } = await import(pathToFileURL(path.join(workRoot, 'server/entry-server.js')))
  validatePages(pages)
  if (!equal(pages, approvedPages) || routeCatalog.length !== pages.length || routeCatalog.some(route => !pages.some(p => p.path === route.path && p.routeName === route.routeName))) throw Error('路由/批准页面目录不一致')
  for (const resource of resources) await readSafeFile(path.join(client, resource.slice(1)))
  const template = (await readSafeFile(path.join(client, 'index.html'))).toString('utf8')
  // Copy only the client bundle. Metadata/server/maps are never copied into public output.
  for (const entry of Object.keys(await digestDirectory(client))) {
    if (entry === 'index.html' || entry.startsWith('.vite/')) continue
    if (entry !== 'favicon.ico' && !/^assets\/[A-Za-z0-9_.-]+\.(?:js|css|svg|png|jpg|webp|woff2?)$/.test(entry)) throw Error('客户端输出含未批准文件')
    const target = path.join(staging, entry)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, await readSafeFile(path.join(client, entry)), { flag: 'wx' })
  }
  for (const page of [...pages, notFoundPage]) {
    let timer
    const result = await Promise.race([
      render(page.routeName === 'not-found' ? '/__ssg_not_found__/' : page.path),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('页面渲染超时')), 30000) }),
    ]).finally(() => clearTimeout(timer))
    const expectedHead = createPageHead(page, environment)
    if (!equal(result.head, expectedHead) || !equal(result.seoEnvironment, environment)) throw Error('SSR/client SEO配置或head不一致')
    const styles = [...new Set(result.modules.flatMap(id => manifest[id] ?? []).filter(file => file.endsWith('.css')))]
    const seo = (expectedHead.canonical ? `<link rel="canonical" href="${escape(expectedHead.canonical)}">` : '')
      + Object.entries(expectedHead.openGraph ?? {}).map(([property, value]) => `<meta property="${escape(property)}" content="${escape(value)}">`).join('')
    const html = template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(expectedHead.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escape(expectedHead.description)}">`)
      .replace(/<meta name="robots" content="[^"]*">/, () => `<meta name="robots" content="${escape(expectedHead.robots)}">`)
      .replace('<div id="app"></div>', () => `<div id="app" data-render-mode="ssg">${result.body}</div>`)
      .replace('</head>', () => seo + styles.filter(file => !template.includes(`href="${file}"`)).map(file => `<link rel="stylesheet" href="${escape(file)}">`).join('') + '</head>')
    const filename = page.routeName === 'not-found' ? '404.html' : page.path.slice(1) + 'index.html'
    const target = path.join(staging, filename)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, html, { flag: 'wx' })
  }
  if (environment.mode === 'production') {
    const urls = pages.map(p => createPageHead(p, environment).canonical)
    if (urls.some(url => !url) || new Set(urls).size !== 8) throw Error('生产索引清单不完整')
    await fs.writeFile(path.join(staging, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${environment.approvedOrigin}/sitemap.xml\n`, { flag: 'wx' })
    await fs.writeFile(path.join(staging, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n') + '\n</urlset>\n', { flag: 'wx' })
  }
  return { staging, manifestPath, validation: await validateCandidateOutput(staging, envelope, manifestPath) }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateLegacyPreview()
