> DEV-01 文档事实核对：当前架构事实（拟议更新）
>
> 核对日期：2026-10-19；唯一开发仓库为 ToxBox仓库，基线 HEAD 为 `928491c9dd56f66494f47c7c8f914bb0c8deb5c4`。本说明只更新文档事实，不授权实现、依赖安装、Git 写操作、远端设置或部署。此前其他开发主线不作为当前进度与审批依据。
>
> 三个工具已实现独立试用页面；Router 4.6.4、Vitest 4.1.11、Playwright 1.64.0 已在声明、锁文件及本地安装中存在。SSG 实现 8个站点页面及404，本地 preview 支持已知路径尾斜杠重定向和未知路径 HTTP 404。客户端及静态页面使用 preview SEO（noindex、无 canonical），正式域名、sitemap/robots 与真实托管行为尚未完成验证。GitHub Actions 工作流及本地验证记录存在，远端运行和分支保护未在本轮核验。历史测试结果不等于当前 HEAD 重新执行通过。 app.ts 创建应用与路由，entry-server.ts 使用 memory history，main.ts 使用 web history 并按静态标记 Hydration。原 Node 测试保留作对照，当前主测试入口已迁移到 Vitest 和 Playwright。下方各日期的“当前”“无框架”“CSR”“无CI”为对应历史阶段描述。
>
> 下文历史正文及证据保留；旧阶段措辞不作为当前实现或授权的唯一依据。

# 前端技术架构

## M1-06B当前基线（2026-10-10，优先于历史盘点）

ADR-018与ADR-020本轮范围获批。app/router工厂、构建端memory history与客户端web history隔离；现有8页及404通过Vue原生SSR生成，客户端createSSRApp Hydration。PageHead和页面目录共用，SSR manifest补齐CSS，最终dist-ssg仅静态文件，不需要常驻服务器。工具仅适配交互准备保护与固定数字展示locale，不改计算规则。

npm run build为类型检查+SSG，preview读取dist-ssg；build:csr为显式开发回退，不能作为本阶段发布候选。当前产物noindex，无canonical/sitemap/robots；正式域名和Cloudflare验证仍待批准。无新增依赖、框架迁移或CI；原151项测试保留，新增3项SSG检查。证据见[本轮验收](../verification/M1-06-ssg-testing.md)。

## M0历史盘点（当前基线见文末M1-05A修订）

目录为 ToxBox，package.json 名称为 toxbox。npm ls --depth=0 读取到：Vue 3.5.43、Vite 8.3.4、TypeScript 6.0.3、vue-tsc 3.3.12、@vitejs/plugin-vue 6.0.10、vite-plugin-vue-devtools 8.2.1；另有 @vue/tsconfig、@tsconfig/node24、@types/node、npm-run-all2。声明版本范围以 package.json 为准，锁定解析以 package-lock.json 为准。

没有 Vue Router、Pinia、Vitest、Playwright、UI 库或 lint 脚本。tsconfig.node.json 中包含测试配置通配路径不代表测试工具已安装。.node-version 为 24，package.json engines 为 ^22.18.0 || >=24.12.0；实际开发运行时需满足 engines。

```text
src/
  main.ts                # 加载 main.css 并挂载 App
  App.vue                # M0时为Vue欢迎页，当前见文末
  assets/                # base.css、main.css、logo.svg
  components/            # 欢迎组件及 icons/ 示例图标
public/favicon.ico
index.html               # M0标题Vite App、lang为空，当前见文末
vite.config.ts           # Vue / DevTools 插件，@ 指向 src
```

M0盘点时无router/、views/、工具业务层或测试目录；这不是当前基线。目录名不应被误认为产品已实现。M0盘点时未取得Git元数据；M1-05A已确认Git工作区可用，见文末修订。

## M0目标模块边界（历史规划；部分现已实现，见文末）

- App.vue：应用组合入口，装配布局与页面，不承载工具算法。
- components/layout/：页头、导航、页脚；components/tools/：工具卡片等展示组件。
- views/HomeView.vue：首页内容和分类目录；后续工具页面按独立规格增设。
- data/tools.ts 与 types/tool.ts：工具元数据及类型；清单是分类、搜索与导航信息的单一来源。
- utils/：无 Vue 依赖的工具纯函数；composables/：必要时承载复制等可复用交互，不提前创建空层。
- assets/base.css：基础样式和设计变量；assets/main.css：全局布局，局部组件用 scoped 样式。
- router/：规划 Vue Router 4 HTML5 History 模式；选型已确认，仍未安装，仅在后续安装与接入任务获授权后创建。001 保持首页锚点导航。

## 数据流与状态

工具元数据 → 首页筛选 → 卡片展示；用户输入 → 页面局部状态 → 纯函数处理 → 结果或错误 → 复制。通过 props 向下传递、事件向上通知；使用组件局部状态，不引入 Pinia。默认只使用内存，不把用户输入写入 localStorage、URL 或远端。

001当时只展示目录与规划状态；002～004现已提供本页试用工具，不需要全局状态。锚点用于首页分区，不承担未来多页面路由。

## 性能、SEO 与扩展

基础布局保留原生 CSS，使用 CSS Variables 管理主题，并使用已有 Vue 能力、系统字体与本地资源；后续工具按页面边界考虑按需加载。浏览器主线程处理超限时先通过独立规格确定输入上限，再评估 Worker，不预建后台服务。

当前为客户端渲染入口。001 先补齐首页静态标题、描述、语言和语义结构；每个正式工具页面必须有独立 URL 和相关 SEO 元数据，规划 Vue Router 4 HTML5 History 模式及 Cloudflare Pages 静态部署。上线前评估静态预渲染并记录方案或暂缓理由，避免仅依赖客户端渲染获取搜索流量；具体预渲染方案尚未选定，SSR 未获批准。canonical 和站点地图待正式域名与基础路径明确后确定。History 模式需在发布准备阶段验证直接访问、刷新和不存在路径的回退行为；尚未批准生产发布。不得用仅更新浏览器标题来保证索引效果。

未来 FastAPI 只能经独立决策引入；届时明确浏览器与服务端边界、数据传输、超时及失败回退。本阶段不创建接口层或后端占位服务。

## 验证策略

现有可用命令为 npm run type-check、npm run build 及 dev/preview。无Vitest/Playwright框架；当前已有Node内置测试和自定义Vue渲染器测试，并以实际浏览器验证核心行为，未测范围单列。Vitest 单元测试方向已确认但尚未安装，后续获安装与配置授权后实施；暂不引入 Playwright，首版主要交互稳定后再评估。支持 Chrome、Edge、Firefox、Safari 当前最新稳定主版本及前一个主版本；验收记录实际版本及操作系统。Lighthouse Performance 90 分以上为初步优化目标，需在生产构建本地预览实测，不作为未经测试的完成承诺；测量和未达标分析必须留档。文档阶段仅检查文档一致性，不执行代码构建或部署。

## M1-05A 实际基线修订与待批准演进（2026-10-10）

本节替代前文已经过期的“欢迎页、无views/工具业务层/tests、无Git元数据”描述；前文版本数据为此前盘点，本轮读取package.json与源码，未重新运行npm ls或构建。

实际App.vue组合components/layout/SiteHeader、唯一main/HomeView、SiteFooter；HomeView用局部展开状态和v-if挂载TextStatisticsView、JsonFormatterView、UrlEncoderView。data/tools.ts和types/tool.ts维护分类、preview状态及首页锚点；utils/和types/已有三个工具纯函数及类型；tests/已有Node内置纯函数与交互测试，自定义Vue渲染器不能替代浏览器。欢迎示例文件尚存，不在本轮清理。index.html已有zh-CN、首页title/description，暂无canonical，description仍有“首批正在规划中”的过期文案，待批准迁移修正。

当前存在Git工作区和既有004源码、测试、规范、证据修改，本轮保留。Vue Router、Vitest、Playwright仍未安装，package.json没有npm test或lint脚本；Node测试文件存在不等于测试框架已安装。002～004 Dev Done已由负责人确认，完整发布验收仍未完成。

[005路由与SEO设计](../specs/005-routing-seo/design.md)提出8个独立页面、共享RouterView布局、工具薄页面包装、静态页面元数据目录、首页旧锚点迁移入口、客户端head及分阶段预渲染评估。具体迁移和依赖审批见ADR-016、017草案，均待批准，不代表router/、composables/或SSR入口已经存在。001仅目录、002～004本页试用为历史实施边界，不应据此前文推断当前没有工具。

## M1-05B实施基线（2026-10-10，优先于历史盘点）

Router4.6.4已安装并使用createWebHistory；package/锁文件只增加获批Router及必要传递条目。App内共享main与RouterView，router/routes.ts显式8页与catch-all；严格区分大小写、规范尾斜杠，规范化不增加额外历史或覆盖来源。三个views/pages工具薄包装复用原交互View及纯函数，离页卸载、不KeepAlive。首页保留分类/隐私摘要与三个旧工具锚点迁移链接，卡片进入独立页面。

data/pages.ts为路径/标题/描述单一来源，utils/seo.ts提供独立head模型与DOM适配；当前显式预览模式noindex，无正式域名不生成canonical。useRouteAccessibility处理焦点、通知、导航错误/重试及过期回调，scrollBehavior恢复历史位置或hash目标。CSS Variables保持，不加Pinia/head库/后端。

当前仍为CSR，原始工具URL HTML不含该页正文；SSR/预渲染、sitemap/robots、Cloudflare真实HTTP404与正式域名仍未实施。[005验收归档](../verification/M1-05-routing-seo.md)区分本地预览与真实托管，不以动态head声称完整SEO。

## M1-06A静态渲染与测试规划（待批准，2026-10-10）

负责人已审查确认M1-05B Dev Done，Release Ready未完成；没有因本次设计重新执行151项测试或浏览器验收。AGENTS与前文早期“Router未安装”记载为历史，当前Router4.6.4实际基线保持。

[006设计](../specs/006-ssg-testing/design.md)建议原生Vue/Vite构建时SSR与自定义SSG，新增app/router工厂及client/server入口隔离，复用vue/server-renderer官方导出；构建端逐页memory history，浏览器createSSRApp Hydration，现有CSR开发入口保留明确回退。当前顶层web-history单例和导航辅助传递导入须先改造，不能直接声称现有组件可SSR运行。规划固定展示locale、Hydration前交互保护、manifest补齐首屏CSS及404路径无关树。

统一测试拟用Vitest、Vue Test Utils/jsdom、Playwright，原151项逐项迁移对照；CI分层、静态HTML/真实浏览器/Hydration验证和正式Safari/手机证据分开。具体依赖、UI适配、生成器参数和CI均是ADR-018～020待批准草案。当前无新SSG入口、测试框架或GitHub workflow；本轮没有业务/配置/依赖变更。
