# 顺手集 / ToolHug

## JSON结构对比定位与跳转（2026-11-16）

`/developer/json-diff/`新增字段路径文字查找、定位首处/上一处/下一处，跨页自动高亮、聚焦并滚动到目标。路径查找只用于定位，列表、统计和完整报告范围保持。420项单元/组件、20项静态与双引擎24项定向通过，限制见[054验证](docs/verification/054-json-diff-navigation.md)。npm run preview:local查看，正式dist未更新，未部署。


## JSON结构对比导入文件（2026-11-16）

`/developer/json-diff/`支持分别导入两份UTF-8 .json文件，每份400000字节/100000码元，可与粘贴混用；成功载入后可编辑、手动比较，失败/取消保留原输入。读取可取消且有10秒保护，旧任务不能覆盖后续编辑。413项单元/组件、20项静态、双引擎16项定向通过，见[053验证](docs/verification/053-json-diff-file-import.md)。使用`npm run preview:local`查看，正式dist未更新，未部署。


## CSV/JSON结果下载（2026-11-16）

`/office/csv-json/`转换成功后可下载UTF-8的`converted.json`或`converted.csv`，内容与结果框一致、不额外添加BOM或换行，合法空CSV可保存为零字节文件。编辑/换向/选项变化会撤销旧下载，内容仅本地处理。使用`npm run preview:local`查看本轮测试产物；正式dist未更新，未部署。实际验证与限制见[052报告](docs/verification/052-table-result-download.md)。


## CSV转JSON对象数组（2026-11-15）

`/office/csv-json/`新增“对象数组（首行作字段名）”模式，值保持字符串，保留前导零及大整数文字；拒绝空白/重复字段名，默认二维数组及JSON转CSV行为保持。401项单元/组件、20项静态与双引擎586项通过，Firefox及人工限制见[043验证](docs/verification/043-csv-object-output.md)。使用`npm run preview:local`查看本地测试产物；正式dist和部署未更新。


## JSON结构对比（2026-11-15）

当前源码和无广告测试预览新增 `/developer/json-diff/`：按字段路径查看JSON新增/删除/修改，忽略对象键顺序，数组按索引，数字按任意精度十进制比较。提供类型筛选、100项分页、完整报告复制及可取消Worker；新页noindex、无统计/广告。当前22工具、30HTML、22指南，24页正式索引保持。实际结果与限制见 [051验证](docs/verification/051-json-structural-diff.md)。

本轮未更新正式dist或部署；使用`npm run preview:local`查看本轮已生成的dist-ssg。默认`npm run preview`仍读取此前048正式dist，不包含050/051变更。以下保留历史阶段记录。

## 文件对比扩容（2026-11-15）

当前源码支持每侧2 MiB、500000个UTF-16码元、5000行，三项须同时满足。文件对比结果每页200行，完整报告按需生成、复制包含当前筛选全部结果；中文选择按钮消除文件状态歧义。类型、单元/组件、静态及Chromium/WebKit回归通过，Firefox和人工限制见 [050验证](docs/verification/050-file-diff-capacity.md)。

本轮仅更新无广告测试产物dist-ssg，运行`npm run preview:local`可查看。默认`npm run preview`仍读取此前048正式dist，尚不包含050扩容；本轮没有正式打包或部署。下方历史功能/产物状态按对应日期理解。

## AdSense脚本接入（2026-11-14）

正式构建已配置4页AdSense加载器：首页、办公/开发分类、关于页；首页所有权meta保留，全部工具页及preview不加载广告。`npm run build`生成可本地预览的生产dist，跨广告边界整页导航。实际验证、构建结果及未完成的后台/发布事项见[048验证](docs/verification/048-adsense-script.md)。代码接入不等于线上投放，本轮不部署；下方“仅元标记/未更新dist”等按各历史阶段理解。

## 文件对比更新（2026-11-14）

已新增 `/office/file-diff/`：本地比较两份UTF-8的TXT、Markdown、CSV、JSON文件，支持只读预览、逐行差异、交换、筛选和复制报告。每份最多1 MiB、解码后100000码元/1000行，文件不上传。当前源码21工具/29HTML/21指南，正式24页索引政策保持，新工具noindex。最新仅更新本地preview，正式dist与部署未更新；验证与限制见[045报告](docs/verification/045-file-diff.md)。文件翻译仍为待服务确认方案。下方11月8日工具数量为历史构建记录；命令入口约定仍有效。

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
