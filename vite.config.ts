import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  appType: isPreview ? 'mpa' : 'spa',
  plugins: [
    vue(),
    { name: 'static-404-preview', configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
  define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
