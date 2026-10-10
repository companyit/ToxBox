> M1-05B当前授权（2026-10-10）：负责人已批准ADR-016及ADR-017核心方案、D-005-01/02/05和阶段拆分，明确授权安装仅vue-router 4.x及路由/客户端SEO实施。以下M1-05A待批描述保留起草历史，以此记录为准；预渲染、托管、正式域名、SEO发布产物与部署仍未授权。实际验证状态见任务文末。

# 005 路由与 SEO 技术设计

状态：2026-10-10，核心迁移方案正式批准，实施及验证结果见tasks；发布/预渲染具体方案仍未授权。关联 [spec](spec.md)、[tasks](tasks.md)、[ADR 草案](../../architecture/decisions.md) ADR-016、017。

## M1-05A实施前基线与兼容性

已检查 package.json、src/、Git。依赖只有 Vue；Router/Vitest/Playwright 未安装，无 npm test 脚本。当前 App.vue 组合 SiteHeader、唯一 main、HomeView、SiteFooter。HomeView 用局部展开状态和 v-if 挂载三个工具，关闭后卸载；ToolCard 的 preview 分支用 anchor 链接，Tool 类型限定三个首页工具锚点。Header 的品牌/分类/隐私链接都是首页内锚点。index.html 只有首页固定标题和描述，没有 canonical；描述仍称工具在规划中。

已有 src/utils/ 与 types/ 中三个工具模块、三个交互 View 和 tests/ 的 Node 内置测试；欢迎示例文件尚存但未作为当前入口。Git 有既有 004 文档、源码和测试修改以及未跟踪证据；本轮只增改规范，不回滚、不混入代码清理。历史前端文档已同步实际基线；原 002～004 的“本页试用、不安装 Router”是各轮实现边界。本提案待批准后才替代其集成方式，不追改算法语义和历史证据。产品 P1-02 搜索仍未实现，本规格不扩展搜索范围。

## 批准的模块与数据流（M1-05B实施，发布扩展除外）

- 保留 App.vue 的 Header/main/Footer，在 main 内用 RouterView；main 的 id 与跳转链接保留。不新增嵌套 main。
- router/index.ts 创建 Router 4 实例，显式命名路由、createWebHistory(import.meta.env.BASE_URL)、传统 scrollBehavior、afterEach；不使用 Router 5 文件路由或实验特性。首页可保持常规导入，工具及其他页面动态导入，实际拆包效果以构建验证为准。
- views/HomeView.vue 只负责首页目录及迁移入口；新增办公/开发者分类、关于、隐私、404 页面。三个工具新增薄页面包装组件提供 h1、说明、面包屑和现有工具 View；不为整理目录强行搬移已验证算法和交互组件。
- 规划 data/pages.ts 定义唯一静态 PageDefinition：routeName、path、title、description、indexable、category（可选）；组件映射留 router，避免元数据被迫导入 Vue。data/tools.ts 通过受约束的 routeName 引用页面，不把路径散落到卡片。
- Tool 联合类型保留 planned 无入口；preview 改用 routeName，通过 RouterLink 展示“试用工具”。独立 URL 不表示已正式发布或 Release Ready。
- 规划 utils/seo.ts 纯函数根据 PageDefinition、明确 SEO 环境生成 head 描述；composables/usePageSeo.ts 或小型适配模块只负责更新 DOM。暂不建议增加 head 管理依赖。
- 状态流：静态目录 → Router → 页面包装 → 工具局部输入 → 原纯函数 → 展示/复制；路由成功 → 元数据/标题通知/焦点滚动。禁止把工具输入放入 route、全局 store、KeepAlive 或缓存。离页卸载，返回新实例为空；普通浏览器刷新初始为空，系统表单恢复需在真实浏览器检查，不能仅凭 Vue 状态推断。

## 首页与导航迁移

采用一次原子迁移：卡片、导航、独立页面同步切换，不保留同一工具在首页和独立页的双交互实例。Header 品牌链接首页；办公、开发者、隐私分别链接分类与隐私页，Footer 增加关于和隐私入口。RouterLink 保持真实 href、新标签打开及 aria-current；分类嵌套路由的精确高亮规则单独测试。

首页保留 #office-tools、#developer-tools 分类摘要和 #privacy 简短隐私说明，完整内容链接独立页。保留 #text-statistics、#json-formatter、#url-encoder 三个不重复 id 的轻量静态迁移入口，说明“已移至独立工具页面”并提供链接，不再展开输入组件、不自动重定向 hash。保留周期待负责人决定，删除须后续变更审批；首页 canonical 不含片段。

已知无尾斜杠路径由客户端规范化 replace，保留导航 query/hash，但不读取其内容作为工具输入；发布时配套已知路径永久重定向，验证无循环。未知地址不做大小写或尾斜杠猜测，走 404。页面说明里的预留路径可继续用无尾斜杠作为兼容入口，规范链接一律带尾斜杠。部署基础路径建议 /，若改子目录必须重新审查资源、Router base、canonical 和托管路径。

## 导航、滚动与焦点时序

首次路由就绪后更新 head，不主动抢用户焦点。后续成功导航用递增导航序号，在组件渲染完成后应用最新导航的动作；失败或被新导航覆盖的旧回调不更新 head/焦点/通知。异步路由失败保留可访问的中文重试提示，不显示已成功进入目标页。

scrollBehavior：popstate 优先 savedPosition；其余有效 hash 等待目标渲染后滚动，缺失 hash 回顶部；普通新页面回顶部。客户端页面改变后把焦点放页面 h1（tabindex=-1）或 main，使用 preventScroll；有有效 hash 时聚焦对应目标。前进/后退仍通知页面标题、聚焦可定位主内容但 preventScroll 保留已恢复位置。仅 hash 变化以目标焦点为主，不把相同标题重复作为新页通知。保留唯一 polite live region，避免标题焦点和通知重复轰炸读屏；实际 VoiceOver 结果决定是否需要调整通知时序。禁 JS 时 anchor/页面导航仍由静态 HTML 提供（只有预渲染获批落地后才能验收）。

## History、Cloudflare 与 404

Router catch-all 仅解决站内 UI；Vite dev/preview 的回退不能证明 Cloudflare 行为。Cloudflare Pages 在没有顶层 404.html 时默认启用 SPA 回退；这会让未知地址也收到入口 HTML，不能作为真实 HTTP404 方案。

建议发布策略：

1. 临时 CSR 产物若单独获准发布：构建顶层 404.html，为已知页面列出精确 200 rewrite 到入口，已知无尾斜杠路径先永久重定向；禁止通配重写所有地址。需在平台等效环境核验规则顺序、静态文件优先级与循环；这是待验证设计，不是现成可用配置。
2. 推荐预渲染发布：已知每页生成对应目录 index.html，配套顶层 404.html；正常文件直达，未知走真实 404，避免吞掉 /assets/ 或 /api/ 缺失路径。404 静态 body 与客户端 404 共享文案/布局原则；不能直接 hydration 成不同的首页树。
3. 客户端未知路由展示相同 404、noindex，无 canonical；已收到 HTTP200 的客户端文档不能改成 HTTP404。直接请求未知 URL 才核验网络状态。

本轮不创建 _redirects、_headers、404.html 或托管配置，不引入 Pages Functions。重定向和 rewrite 精确语法待渲染产物选择与发布准备审批后编写并实测。

## SEO 元数据与产物

PageDefinition 为客户端 head、未来预渲染 head、sitemap 的同一来源；title/description 必填且全表唯一。DOM 更新使用 textContent/setAttribute，按固定标记更新或移除本项目管理的标签，保证不叠加，不读取用户输入；404 清理上一页 canonical。HTML 模板、客户端和将来预渲染不得同时生成冲突的标签。

规划 SeoEnvironment 含 mode（本地/预览/正式）和可选 approvedOrigin。正式 origin 必须是负责人批准的 HTTPS origin，无凭据、query、hash、子路径；未知不填假域名。生产 canonical 为 origin + 规范 path，忽略当前 query/hash；本地/预览不写 canonical，使用 noindex，正式模式缺失 origin 报明确构建配置错误。正式开放抓取前，初始 HTML 的 robots 与最终客户端 robots 必须一致；禁止在正式 HTML 放 noindex 后指望 JS 改成 index。

sitemap.xml、robots.txt 只在正式域名、公开页面清单及生成任务另获批准后生成。按 indexable 白名单导出8个已批准页面（若某页被批准不索引则剔除），404/API/预览/别名排除；lastmod 没有真实内容更新时间就省略。robots 引用同一 origin 的 sitemap；预览保护依赖 noindex/平台响应头核验，不把 robots 当保密工具。正式域名确认前可以测试纯函数的测试 origin，但不得把测试域名输出为生产产物。

## A/B/C 静态渲染比较

以下是基于官方机制的定性评估，构建耗时、体积和 SEO 效果均未实测。

| 维度 | A：现有 Vite + Vue CSR SPA | B：保留 Vite + Vue，构建时预渲染 | C：后期迁移 Vue SSG 框架（如 Nuxt 静态生成） |
| --- | --- | --- | --- |
| SEO 内容可见性 | 初始 HTML 缺路由正文，依赖爬虫执行 JS；改 title 不保证抓取 | 每路由初始 HTML 可含正文/head，仍不保证索引 | 框架生成每路由正文/head，仍须收录策略 |
| 开发维护复杂度 | 当前最低，但 head/回退自管 | 中等，维护渲染入口、路由清单、HTML/head与 hydration | 初次迁移较高，遵循框架目录/构建约定，之后可用集成能力 |
| 现有组件兼容性 | 直接复用 | 纯函数可复用，交互组件须排查 SSR 安全/确定性 | Vue 组件多可复用，入口/路由/head/构建测试需适配 |
| 构建时间 | 只构建客户端，作为实测基线 | 增加按页面渲染，随页面数增长；无时间承诺 | 框架构建加预渲染，随页面数增长；需对比实测 |
| Cloudflare Pages 静态兼容 | 可托管，必须验证深链和真实404 | 目录 HTML 静态托管，需核验 slash/404/缓存 | 选择静态输出可托管，不需要运行时服务；不能误选动态部署 |
| 工具数量扩展 | 页面增多时 CSR SEO 局限不消失 | 当前8页可控，扩展后记录构建耗时和路由遗漏检查 | 大量内容页面时约定与生态可能减少维护，迁移成本需再评估 |
| 测试影响 | 增加路由/head/焦点和工具回归 | 再增逐页HTML、禁JS、hydration与构建产物测试 | 保留算法测试，重做框架路由、head、构建和部署测试 |

建议：先批准 M1-05B 路由和客户端元数据以完成迁移；上线前优先对 B 做独立小型验证，不把 A 当长期搜索流量方案，不在本轮转 C。B 建议优先评估 Vue 官方 SSR API 的构建时渲染，而非线上 SSR；不需要后端。候选 @vue/server-renderer 须与 Vue 同版本并单独批准直接依赖声明/构建接入，是否已有传递依赖不能替代授权。第三方预渲染插件需另评兼容性和维护状态，不预先锁定插件。C 仅是长期备选，不授权框架迁移。

### B 的 hydration 验证方案（尚未实施）

构建时用应用工厂创建独立实例、createMemoryHistory，push 每个静态路由并等待就绪，再 renderToString，合并同源纯函数生成的 head。每个路由初始工具为空，不运行剪贴板、不访问 window/document/navigator、不读取构建机文件内容作为用户输入。客户端必须使用匹配的 createSSRApp 挂载并等待同路由就绪；现有 createApp 挂载不能直接称为 hydration。

初始 HTML 与客户端树一致，避免时区/随机值/系统偏好/本地数字格式造成差异；主题由 CSS 处理，必要时固定显示格式而不改变算法。浏览器 API 只在挂载后或用户操作时执行；无 JS 时明确提示工具交互需要 JS，不把按钮视为已能计算。检查空状态、示例、复制、导航及三个工具在 hydration 后均仅绑定一次事件，无警告、失焦或重复 main/h1。预渲染只含工具说明与空表单，不含真实用户文本。构建脚本、SSR 入口与客户端入口更改全部需后续独立授权。

## 未来服务端边界

保留用户工具 URL，未来 /api/v1/ 使用独立服务适配层与单独托管规则，不能复用页面 catch-all；当前不创建该层。增加 FastAPI、上传处理、跨域、安全策略或用户协议必须新 ADR；本地工具不因未来 API 引入而默认上传内容。

## 决策审批记录（当前授权优先于原建议）

| 编号 | 建议 | 审批影响 |
| --- | --- | --- |
| D-005-01 / ADR-016 | 8页+404、根部署、尾斜杠、无斜杠兼容、首页移除交互保留旧锚点 | M1-05B 迁移前批准，关于/隐私正文审阅 |
| D-005-02 / ADR-016 | 明确安装 vue-router 4.x；轻量静态目录与原生 DOM head 管理，不加 head 库 | 需安装与锁文件修改的明确授权；不得默认安装最新版主版本 |
| D-005-03 / ADR-017 | M1-05B只做CSR迁移；B预渲染独立验证优先，C暂缓 | 预渲染实现/候选直接依赖仍未获批准 |
| D-005-04 / ADR-017 | 已知路径回退与真实404分层，正式 SEO 产物生成门禁 | 托管配置、正式origin及公开索引策略发布前批准；不阻塞纯客户端迁移审查 |
| D-005-05 | 新页焦点/历史恢复/通知规则、离页清空，不保留草稿 | M1-05B 交互审批；保留旧锚点周期可后定，默认不删除 |

## 官方参考（2026-10-10 查阅）

- [Vue Router History](https://router.vuejs.org/guide/essentials/history-mode.html)：深链需托管支持，客户端404与HTTP状态分离；页面包含4/5资料，实施仅限批准的4.x API。
- [Cloudflare Pages 路径与404](https://developers.cloudflare.com/pages/configuration/serving-pages/)、[redirects/rewrite](https://developers.cloudflare.com/pages/configuration/redirects/)：默认SPA回退条件、静态路径和规则须结合产物验证。
- [Vue SSR](https://vuejs.org/guide/scaling-up/ssr.html)、[Vite SSR](https://vite.dev/guide/ssr.html)：构建时渲染与 hydration 评估依据。
- [Nuxt 官方预渲染文档源](https://github.com/nuxt/nuxt/blob/main/docs/1.getting-started/15.prerendering.md)：C 的静态生成能力参考，不是迁移批准。
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)：CSR 抓取/渲染、canonical和状态的局限；不承诺收录。

## M1-05B历史规范化实现细化

已知无尾斜杠地址在beforeEach中、历史提交前规范化，不强制覆盖用户导航的push/replace意图：初始直达仍由Router初始replace处理，站内push只提交规范地址一次。若所有规范化重定向强制replace，会覆盖来源历史条目，破坏返回；本轮测试发现后采用上述方式并复验，不增加中间非规范历史。

M1-05B审批结果：D-005-01/02/05及D-005-03阶段拆分已批准；D-005-04分层原则获批，正式origin、公开索引策略、具体托管配置与产物仍待发布准备审批。当前采用vue-router4.6.4，客户端预览noindex，无canonical，不生成sitemap/robots；未接入SSR或hydration。
