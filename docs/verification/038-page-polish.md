# 038 页面布局与展示文案优化验证

日期：2026-11-12。负责人明确要求移除“试用”字样并调优整体布局。按 038 规格先记录需求，再执行本轮展示修改。

## 实际变化与文件

- `src/components/tools/ToolCard.vue`：可用卡片不再显示试用标签，入口为“打开工具”；保留规划中状态。入口改为整行底部按钮，卡片统一圆角、说明完整，减少动态偏好下不启用悬浮位移。
- `src/views/HomeView.vue`：增加办公/开发者分类快捷锚点和动态数量，随搜索结果变化；收紧首页/搜索/分区留白，宽屏四列。
- `src/views/pages/CategoryPage.vue`：增加分类工具数量，与首页统一 1/2/3/4 列断点。
- `src/components/layout/ToolPageLayout.vue`：缩小工具标题与上下留白，保留表单和工作区几何。
- `src/views/pages/AboutPage.vue`、`TermsPage.vue`：移除试用阶段文字，保留功能限制和责任说明。
- `e2e/ui-layout.spec.ts`：按已要求的入口名称及四列断点更新断言；`e2e/page-polish.spec.ts` 覆盖新展示、搜索恢复、窄屏和深色截图。
- `tests/ssg/homeCleanup.test.ts`：原断言禁止任何“打开”链接，会误拒绝新的工具入口；改为禁止卡片外重复打开入口，保留无迁移区、精确 20 工具及分类数量检查，并补无试用字样检查。首轮失败证据保留。
- 规格为 `docs/specs/038-page-polish/` 下三份文档，产品要求追加至 `docs/product/requirements.md`。

内部 preview 数据状态、SEO preview 模式仍按现有用途工作。未改工具算法、依赖、索引、广告或远端。保留工作区本已有的 037 构建入口、package、工作流、发布文档等改动；按其实际脚本执行构建，不将它们计作本轮实现。

## 实际验证

- 类型检查通过。
- 单元/组件：46 文件、332 项通过。
- SSG：首次 17 通过、1 项旧文案断言失败；修订断言后 16 文件、18 项全通过。
- Chromium/WebKit：32 项全通过，覆盖 320/375/390/430/768/1024/1280/1440/1920px 首页和分类几何、新文案、搜索及焦点恢复；无横向溢出。
- 已查看 1440px 桌面与 375px 手机完整截图；同时生成三个目标尺寸及 320px 的浅色/深色截图。Firefox、真实设备及完整人工读屏矩阵本轮未验证。
- 最终 `npm run build` 成功生成正式 SSG 到 `dist/` 及独立发布包，未部署。`git diff --check` 通过；`src` 搜索不再出现“试用”字样。

证据目录：[浏览器结果](evidence/page-polish/results.json)，日志和截图在同目录；首轮 SSG 失败及最终成功日志均保留。

最终生产包：`.ci/handoff/toolhug-20261112120900263-e5c5af7e/toolhug-20261112120900263-e5c5af7e-site.tar.gz`，SHA256：`8b343774bafa79e1d7cee5663954eb18bd1065d99a658f1f43688f1b461da8b9`。可用的 `dist/` 是本地构建结果，不能称为线上已更新。
