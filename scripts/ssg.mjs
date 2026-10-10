import { build } from 'vite'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
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
async function generate() {
  // 本次失败不能留下可被误认为成功的旧候选产物。
  await fs.rm(output, { recursive: true, force: true })
  await fs.rm(work, { recursive: true, force: true })
  const timer = setTimeout(() => { console.error('SSG整体超时'); process.exit(1) }, 300000)
  try {
    if (process.env.SSG_SEO_MODE && process.env.SSG_SEO_MODE !== 'preview') throw Error('当前仅批准preview产物，正式SEO构建须另行审批')
    const client = path.join(work, 'client')
    await build({ build: { outDir: client, ssrManifest: true, emptyOutDir: true } })
    await build({ build: { outDir: path.join(work, 'server'), ssr: 'src/entry-server.ts', emptyOutDir: true } })
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
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generate()
