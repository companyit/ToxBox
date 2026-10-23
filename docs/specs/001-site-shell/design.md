# DEV-06UI-B1 当前增补（2026-10-20）

负责人正式授权本批规格、源码、新增UI测试及必要本地验证；旧Pending已被本轮授权取代。现有Router/SSG/测试配置为当前事实，下文历史记录保留，不作为本轮执行结果。

仅B0的B1十二文件。新增语义宽度/圆角/边距Token，旧spacing及明暗颜色保留。App仅按既有route.name赋予首页/分类展示class。首页静态概览无重复工具链接；保留迁移入口。Header/Footer自然文档流。卡片flex纵排，入口位于底部；分类单卡最大420px。三工具、路由、SEO、SSG算法与全部script保持原字节。

---

# 001 网站基础布局技术设计

状态：M0-03 人工审阅技术决策已同步（2026-10-10）；以下文件调整均为未来实施计划，待 M1-01 明确编码授权，本轮不执行。需求来源：[spec.md](spec.md)。

## 基线与方案

现有入口 src/main.ts 挂载 App.vue 并导入 assets/main.css；App.vue 和全局 CSS 仍为欢迎模板。无 Vue Router 或测试框架。001 沿用现有挂载流程，以 Vue 单文件组件、TypeScript 和原生 CSS 实现单页锚点导航，不增加依赖。

## 计划文件与职责

| 文件（规划） | 职责 | 对应需求 |
| --- | --- | --- |
| src/App.vue | 组合页头、首页和页脚 | SHELL-01、07 |
| src/components/layout/SiteHeader.vue | 品牌、页内导航、跳转主内容链接 | SHELL-01、02、05 |
| src/components/layout/SiteFooter.vue | 品牌页脚 | SHELL-07 |
| src/views/HomeView.vue | 主内容、定位、分类、隐私说明 | SHELL-01、03、07、09 |
| src/components/tools/ToolCard.vue | 展示工具信息与规划状态 | SHELL-03、04、05 |
| src/types/tool.ts | 工具元数据类型 | SHELL-03 |
| src/data/tools.ts | 唯一工具清单 | SHELL-03、09 |
| src/assets/base.css、main.css | 设计变量、基础样式、响应式布局 | SHELL-04、05、08 |
| index.html | 中文语言、标题和描述 | SHELL-06 |

这些目录与文件大多尚不存在。欢迎组件不再导入即可，本规格不要求删除已有示例资源。main.ts 无需改变；不改 package.json、package-lock.json、Vite 或 TypeScript 配置。

## 结构与数据

SiteHeader → main#main-content（HomeView）→ SiteFooter。main 由 App 提供，HomeView 不再嵌套 main；唯一 h1 位于首页，分类及隐私标题用 h2。页首锚点为 top，分区为 office-tools、developer-tools、privacy。

元数据字段：id（稳定且唯一）、name、description、category（office/developer）、status（本规格仅 planned）。初始清单为 text-stats、json-formatter、url-codec，对应文本统计、JSON 格式化/校验、URL 编解码。001 无 path 字段，无虚假工具链接；未来扩展 available 状态及路径须随路由规格一起设计。HomeView 按 category 分组，ToolCard 接收只读元数据，不维护副本。空分组显示明确占位文案。

使用组件局部状态，不引入 Pinia，不设全局状态，不访问网络、不持久化、不引入用户输入区。交互仅包括锚点导航与跳转主内容，因此不存在业务加载状态。

## 视觉与交互

使用 CSS 变量统一颜色、间距、圆角和内容最大宽度。系统字体，遵循 prefers-color-scheme；浅色和深色都检查对比度。默认移动优先：小于 640px 单列，640～1023px 两列，1024px 以上三列；容器最大宽度 1200px，两侧保留至少 16px 间距。768px 的列数不强求填满。

导航始终展示并允许换行，不引入汉堡菜单状态。页头采用普通文档流；如后续采用固定定位，须补充锚点偏移验收。跳转链接获焦后可见，main 设 tabindex="-1" 并验证激活后的实际焦点。交互元素提供 focus-visible 样式；规划卡片用普通内容元素加文字状态，不设置按钮、链接或无效 tabindex。不添加非必要动画，长文本允许换行。

当前全局 CSS 的 body 居中与 #app 双栏需在授权实施时替换为网站布局，否则会与新页面冲突。不可仅追加覆盖而遗漏桌面断点。

## SEO、性能及验证

按 SHELL-06 修改静态 HTML 头部。动态首页正文仍由客户端渲染；本设计不保证索引，不引入 SSR、站点地图或假域名。正式工具后续采用 Vue Router 4 HTML5 History 独立 URL 和相关 SEO 元数据；规划 Cloudflare Pages 静态部署，生产发布未批准，上线前必须评估静态预渲染并记录结论。

授权实现后执行 type-check 和 build；用 preview 本地检查生产产物。对 dist/assets 中首页入口及静态依赖的自有 JS/CSS 分别 gzip 后求和，包含共享代码、排除未请求的资源，报告文件集合和压缩后字节数，仅作观察数据，不设 150 KiB 硬门槛。Lighthouse Performance 目标 90 分以上，需实际测量，不等于已通过。

人工检查三个指定视口、200% 缩放、键盘焦点、系统明暗模式、空分类和长文案；检查浏览器控制台及网络记录。记录浏览器具体版本；在 Chrome、Edge、Firefox、Safari 最新稳定主版本及前一个主版本验证核心布局和导航，记录操作系统；无法验证的平台或版本如实标记未验证，不计为通过。自动化框架未安装，不添加测试文件或测试脚本。

## 实施边界与后续事项

产品顺序、CSS、局部状态、路由方向、测试方向、浏览器范围、初步性能目标及托管规划已经确认，详见 ADR-003～013。001 继续使用锚点与规划卡片，不提前安装路由或测试框架。M1-01 仅剩明确编码授权门槛；工具实现、依赖安装及发布细节留待后续任务，不阻塞基础布局技术准备。


## Lighthouse 测量约定

后续实现使用生产构建本地 preview，浏览器无扩展干扰、无其他页面负载；分别用 Lighthouse 默认移动端与桌面端配置各执行 3 次，报告各次分数及中位数。记录 Lighthouse/Chrome 版本、机器与操作系统、URL、配置、日期和报告位置，使结果可复查。两种配置均以 90 分以上为初步目标；未达到时分析原因并提出后续任务，不虚构完成承诺，也不自动扩大本次实现范围。Lighthouse 本身不作为新增项目 npm 依赖；文档阶段不执行测量，不作历史结果声明。
