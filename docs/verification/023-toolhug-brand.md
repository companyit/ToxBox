# 023 顺手集 / ToolHug 品牌接入与验证

日期：2026-11-07（Asia/Shanghai）。负责人选定“顺手集 / ToolHug”后明确“可以，按这个推动”，本轮按BRAND-05～08执行本地接入。HEAD为`856aea8dd3ec6305b6109bb062685ee7332f302e`，结果针对包含既有未提交文件的工作区，不表述为该提交独立通过。未改仓库目录/package名称toxbox、域名/邮箱、技术环境变量、依赖/锁或部署；商标/图形正式核验仍未完成，不作注册/独占/无纠纷保证。

## 修改与行为

- `src/data/site.ts`：集中定义中文名顺手集、英文ToolHug及组合显示名；相关政策日期为2026-11-07。
- `BrandMark.vue` 与页头/页脚：批准的括号＋四模块SVG，无外部素材/字体，图标装饰aria-hidden。页头双名、36px图标、44px点击范围及完整返回首页可访问名称；沿用自然文档流和键盘行为。深色按现有主题使用浅绿。
- `pages.ts`、`seo.ts`、`index.html`：首页/工具/关于/404标题及描述、正式SEO模型og:site_name统一；preview继续noindex且无canonical，八页正式索引不扩容。关于/联系/条款文案同步，JSON主动示例和占位为ToolHug，示例防覆盖与处理算法不变。
- `public/favicon.svg`：与批准图形相同，使用prefers-color-scheme适配明暗；`favicon.ico`为同一SVG经本地Chromium渲染并封装的16/32/48px透明PNG帧，无新增依赖。HTML保留ICO回退。
- `scripts/ssg.mjs` 和 `vite.config.ts`：严格守卫仅增加/favicon.svg具体路径，不开放其他顶层SVG。静态和浏览器检查同时覆盖新路径真实200/MIME、缺失其他图标路径仍404。
- 更新当前品牌相关E2E与组件断言，新增`tests/ssg/brand.test.ts`和`e2e/brand.spec.ts`。JSON历史旧runner示例断言同步新名称；`tests/migration.json`不改，原文保存至`tests/legacy-baselines/jsonFormatterInteraction.pre-toolhug.test.mjs.txt`，source-evolution登记原/当前SHA和理由，154项身份及所有其他断言保留。

14工具、21站点页面加404（22HTML）、14指南及既有搜索/本地文件/复制/敏感文档边界保持。源码及入口HTML已无WorkDev Tools/ToxBox/Vemlito对外文字残留，历史报告/旧稿/技术变量不批量替换。

## 实际验证进展

类型、280项单元/组件、CSR/SSG、154项身份审计、9项SSG（含新增2项品牌/图标）及广告准备审计已通过。完整双引擎最终400项已通过，最终结果和截图见下表。生产SEO只执行既有纯模型断言，不生成新生产候选或远端部署。

## 失败与修正

首轮浏览器中4项品牌图标与1项资源检查因/favicon.svg返回404失败：SSG文件已正确存在，但本地Vite preview仍按旧白名单拦截。定位后对本轮runner发送SIGINT，保留5项失败、1项中断、135项通过、259项未运行的记录，不把中断轮作为完整结果；目录为`evidence/m106c3/runs/2026-11-07T03-18-31.565Z-8373/`。等待本轮结束后才修改Vite配置，精确加入/favicon.svg并新增/favicon-other.svg仍404的负向用例，重新完整构建和双引擎回归。

## 范围及待验收

本轮是品牌展示接入，不是法律清障或生产发布。名称/图形普通网页筛选与未完成范围见 [设计初筛](../designs/toolhug-brand/README.md)；目标国家/地区商标当前状态、中文/英文近似、图形和域名可用性仍待核验，不声称合法独占或注册。未采购字体或注册域名/商标。

真实手机、真实读屏、系统剪贴板/文件保存、Firefox及完整真实Safari版本矩阵未完成；负责人需签收最终应用视觉。Vite未来native配置加载器的类型导入扩展名提示保留。真实托管favicon.svg访问、缓存和旧包替换需后续实际发布时独立检查，不用本地preview代替公网结果。

| 人工项 | 预期 | 状态 |
| --- | --- | --- |
| 页头/页脚中文英文及标志 | 明暗可辨、36px图标和44px范围、窄屏不溢出 | 待签收 |
| 关于/联系/政策、标题、旧链接 | 新名称一致，原路由/深链接行为正常 | 待签收 |
| 标签页图标/收藏夹/旧缓存 | 新SVG或ICO可辨，真实浏览器缓存更新可核对 | 未测 |
| 名称与图形正式清障 | 主要地区、商品服务、近似与状态核验及专业意见 | 未完成 |

不执行新生产候选、打包或部署。

## 最终结果

| 检查 | 实际结果 |
| --- | --- |
| 应用与测试类型 | 最终runner完整构建通过 |
| 单元/组件 | 34文件、280项通过 |
| SSG构建 | 22HTML，通过 |
| 静态测试 | 7文件、9项通过；含22页品牌/元信息/favicons一致性、ICO帧及纯production SEO模型品牌 |
| CSR构建 | 最终配置重跑通过 |
| 历史身份 | 154项原始映射/账本SHA/快照/当前演进及负向保护通过 |
| 广告准备审计 | 22HTML、88页脚链接、14指南通过，广告关闭 |
| Chromium/WebKit | 400项全部通过，约3.1分钟，源/测试/夹具/Playwright配置/锁/产物摘要复核通过，预览端口释放 |
| 代码与文档 | 源码及index.html旧品牌搜索无结果，git diff --check及相对链接检查通过 |

最终证据：[运行记录](evidence/m106c3/runs/2026-11-07T03-19-50.714Z-9397/run.json)、[绑定源/产物摘要](evidence/m106c3/runs/2026-11-07T03-19-50.714Z-9397/build-sha256.json)、[逐项结果和附件](evidence/m106c3/runs/2026-11-07T03-19-50.714Z-9397/results.json)。额外的Vite/SSG守卫、公共favicon、品牌测试、历史身份演进及依赖文件SHA见 [品牌接入文件摘要](evidence/toolhug-brand/brand-input-sha256.json)；不把runner单独绑定的Playwright配置描述为绑定全部仓库配置。

品牌新增8项双引擎用例覆盖两主题×375/1440双语名称、装饰图标、44px链接/36px图标、标题/关于导航、SVG真实200/MIME和明暗色、未批准图标404。原F44的15视口品牌图标/文字/上下边缘点击、键盘与布局回归均通过，新SVG未缩减点击范围。所有工具、文档隔离和UI2明暗/首屏/重排回归同时通过。

效果图：[桌面](evidence/toolhug-brand/desktop.png)、[手机](evidence/toolhug-brand/mobile.png)、[深色桌面](evidence/toolhug-brand/desktop-dark.png)。已目视核对实际桌面浅色和手机深色截图，页头/页脚双名及新图形可辨，无横向溢出；其他组合保留在最终附件。favicon16/32/48px原始渲染图保存在同目录，真实浏览器标签页/收藏夹缓存人工验收尚未完成。

本地接入完成不等于法律清障、负责人应用视觉签收或生产上线；不执行生产候选、打包、Git写操作和部署。
