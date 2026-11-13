# 顺手集 / ToolHug

## 当前构建与运行方式（2026-11-08）

```sh
npm run dev      # 开发调试，保存源码后自动更新
npm run build    # 类型检查 + 完整生产SSG + 包/归档校验，更新 dist/
npm run preview  # 使用HTTP服务查看同一份 dist/，按终端提示访问
```

`npm run build`成功后，`dist/`包含当前20个工具、28个HTML、24条正式索引和PDF等静态资源；可检查`dist/office/image-crop/index.html`等新增页面。请通过HTTP服务器访问，不能直接双击HTML用file://打开。构建和本地预览不等于已部署或被搜索引擎收录。

| 命令 | 用途与目录 |
| --- | --- |
| `build`、`build-only`、`build:release` | 完整生产门禁并更新dist；build-only保留为兼容同义入口，同样含类型/包校验；旧dist在本次`.ci/handoff/<ID>/previous-dist`保留 |
| `preview` | 读取dist生产文件；缺少dist时先运行build，使用终端显示的HTTP地址 |
| `build:preview` | 类型检查并生成独立noindex测试站点dist-ssg，不改dist |
| `build:preview-only` | 仅生成上述noindex SSG，作为内部构建子步骤 |
| `preview:local` | 查看dist-ssg，供测试/人工预览，须先build:preview |
| `build:csr` | 显式CSR实验，单独输出dist-csr，不覆盖完整生产dist；不作为静态托管发布物 |

自动化验收仍采用`npm test`或`npm run test:e2e`；runner已明确使用build:preview和preview:local，不会把生产dist当作noindex测试产物。实际修复与验收见[037验证](docs/verification/037-build-entry.md)，发布操作另行授权。

---

以下保留初始化及旧阶段记录；其中build/preview与目录说明以本页上方037当前约定为准。

> DEV-01 文档事实核对：项目现状与可用命令（拟议更新）
>
> 核对日期：2026-10-19；唯一开发仓库为 ToxBox仓库，基线 HEAD 为 `928491c9dd56f66494f47c7c8f914bb0c8deb5c4`。本说明只更新文档事实，不授权实现、依赖安装、Git 写操作、远端设置或部署。此前其他开发主线不作为当前进度与审批依据。
>
> 三个工具已实现独立试用页面；Router 4.6.4、Vitest 4.1.11、Playwright 1.64.0 已在声明、锁文件及本地安装中存在。SSG 实现 8个站点页面及404，本地 preview 支持已知路径尾斜杠重定向和未知路径 HTTP 404。客户端及静态页面使用 preview SEO（noindex、无 canonical），正式域名、sitemap/robots 与真实托管行为尚未完成验证。GitHub Actions 工作流及本地验证记录存在，远端运行和分支保护未在本轮核验。历史测试结果不等于当前 HEAD 重新执行通过。 当前 package scripts 包含 dev、type-check、test:inventory、test:vitest、build（类型检查+SSG）、build-only（SSG）、test:ssg、test（Chromium）、test:e2e（三引擎）、test:ci:e2e（已核验产物入口）和 preview。开发环境使用 .node-version 指定的 Node 24.21.0。下方 Vue/Vite 模板文字保留为初始化参考，不代表当前产品功能范围；本文档事实说明不授权安装依赖。
>
> 下文历史正文及证据保留；旧阶段措辞不作为当前实现或授权的唯一依据。

# ToxBox

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
