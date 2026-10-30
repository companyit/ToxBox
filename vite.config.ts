import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolveViteSeoContext, readSafeFile, repositoryRoot } from './scripts/release-candidate.mjs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(async ({ command, isPreview }): Promise<UserConfig> => {
  const context = await resolveViteSeoContext(Boolean(isPreview))
  const envelope = JSON.stringify(context.envelope)
  const publicRoot = context.candidate?.output ?? fileURLToPath(new URL('./dist-ssg', import.meta.url))
  return {
  appType: isPreview ? 'mpa' : 'spa',
  ...(context.candidate ? { build: { outDir: publicRoot } } : {}),
  plugins: [
    vue(),
    { name: 'approved-seo-envelope', configResolved(config) {
      if (config.define?.__WORKDEV_SEO_CONFIG__ !== envelope || path.resolve(config.root) !== repositoryRoot) throw Error('最终构建SEO配置被覆盖')
      if (context.candidate && path.resolve(config.root, config.build.outDir) !== publicRoot) throw Error('preview真实根与receipt不一致')
    } },
    { name: 'static-404-preview', configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Verified candidates serve only their exact public manifest; no build or SPA fallback.
        if (context.candidate) {
          try {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1')
            const pathname = url.pathname
            const files = context.candidate.receipt.output.files
            if (/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+$/.test(pathname) && files[pathname.slice(1) + '/index.html']) {
              res.statusCode = 308; res.setHeader('Location', pathname + '/' + url.search); res.end(); return
            }
            const knownDirectory = /^\/(?:[a-z0-9-]+\/)*$/.test(pathname)
            const filename = knownDirectory ? pathname.slice(1) + 'index.html' : pathname.slice(1)
            const entry = Object.hasOwn(files, filename) ? files[filename] : undefined
            if (entry) {
              const bytes = await readSafeFile(path.join(publicRoot, filename))
              const { createHash } = await import('node:crypto')
              if (bytes.length !== entry.size || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw Error('被预览资源已变化')
              const { contentTypeFor } = await import('./scripts/ssg.mjs')
              res.statusCode = filename === '404.html' ? 404 : 200
              res.setHeader('Content-Type', contentTypeFor(filename)); res.end(bytes); return
            }
            res.statusCode = 404
            if (pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname.startsWith('/assets/') || pathname === '/favicon.ico' || pathname.startsWith('/api/')) {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Not Found'); return
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(await readSafeFile(path.join(publicRoot, '404.html'))); return
          } catch {
            res.statusCode = 500; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end('Candidate integrity error'); return
          }
        }
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
        if (pathname.startsWith('/assets/') || pathname === '/favicon.ico') return next()
        if (/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+$/.test(pathname)) {
          try {
            await readFile(new URL(`./dist-ssg${pathname}/index.html`, import.meta.url))
            res.statusCode = 308
            res.setHeader('Location', pathname + '/' + new URL(req.url ?? '/', 'http://localhost').search)
            res.end(); return
          } catch { /* 未知路径继续静态404。 */ }
        }
        const safePath = /^\/(?:[a-z0-9-]+\/)*$/.test(pathname)
        try {
          const file = safePath ? `./dist-ssg${pathname}index.html` : './dist-ssg/404.html'
          let html: string
          try { html = await readFile(new URL(file, import.meta.url), 'utf8'); res.statusCode = safePath ? 200 : 404 }
          catch { html = await readFile(new URL('./dist-ssg/404.html', import.meta.url), 'utf8'); res.statusCode = 404 }
          res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html)
        } catch { next() }
      })
    } },
    ...(command === 'serve' ? [vueDevTools()] : []),
  ],
  define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true, __WORKDEV_SEO_CONFIG__: envelope },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  }
})
