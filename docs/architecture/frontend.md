# 前端技术架构

## 实际基线（2026-10-10）

目录为 ToxBox，package.json 名称为 toxbox。npm ls --depth=0 读取到：Vue 3.5.43、Vite 8.3.4、TypeScript 6.0.3、vue-tsc 3.3.12、@vitejs/plugin-vue 6.0.10、vite-plugin-vue-devtools 8.2.1；另有 @vue/tsconfig、@tsconfig/node24、@types/node、npm-run-all2。声明版本范围以 package.json 为准，锁定解析以 package-lock.json 为准。

没有 Vue Router、Pinia、Vitest、Playwright、UI 库或 lint 脚本。tsconfig.node.json 中包含测试配置通配路径不代表测试工具已安装。.node-version 为 24，package.json engines 为 ^22.18.0 || >=24.12.0；实际开发运行时需满足 engines。

```text
src/
  main.ts                # 加载 main.css 并挂载 App
  App.vue                # 当前为 Vue 欢迎页
  assets/                # base.css、main.css、logo.svg
  components/            # 欢迎组件及 icons/ 示例图标
public/favicon.ico
index.html               # 当前标题 Vite App，lang 为空
vite.config.ts           # Vue / DevTools 插件，@ 指向 src
```

当前无 router/、views/、工具业务层或测试目录。目录名不应被误认为产品已实现。工作区检查时没有 Git 仓库元数据，不能使用 Git 差异作为本轮验证证据。

## 目标模块边界（规划，尚未创建）

- App.vue：应用组合入口，装配布局与页面，不承载工具算法。
- components/layout/：页头、导航、页脚；components/tools/：工具卡片等展示组件。
- views/HomeView.vue：首页内容和分类目录；后续工具页面按独立规格增设。
- data/tools.ts 与 types/tool.ts：工具元数据及类型；清单是分类、搜索与导航信息的单一来源。
- utils/：无 Vue 依赖的工具纯函数；composables/：必要时承载复制等可复用交互，不提前创建空层。
- assets/base.css：基础样式和设计变量；assets/main.css：全局布局，局部组件用 scoped 样式。
- router/：仅在 Vue Router 决策获批、依赖安装获批后引入。

## 数据流与状态

工具元数据 → 首页筛选 → 卡片展示；用户输入 → 页面局部状态 → 纯函数处理 → 结果或错误 → 复制。通过 props 向下传递、事件向上通知；跨组件需求出现前不引入全局状态库。默认只使用内存，不把用户输入写入 localStorage、URL 或远端。

001 只展示目录与规划状态，不需要真实工具算法或全局状态。锚点用于首页分区，不承担未来多页面路由。

## 性能、SEO 与扩展

基础布局使用原生 HTML/CSS 和已有 Vue 能力、系统字体与本地资源；后续工具按页面边界考虑按需加载。浏览器主线程处理超限时先通过独立规格确定输入上限，再评估 Worker，不预建后台服务。

当前为客户端渲染入口。001 先补齐首页静态标题、描述、语言和语义结构；独立工具地址、canonical、站点地图及预渲染/SSR 需结合域名和托管决策处理。不得用仅更新浏览器标题来保证索引效果。

未来 FastAPI 只能经独立决策引入；届时明确浏览器与服务端边界、数据传输、超时及失败回退。本阶段不创建接口层或后端占位服务。

## 验证策略

现有可用命令为 npm run type-check、npm run build 及 dev/preview。无自动化测试框架；当前使用规格驱动的人工行为检查，记录浏览器版本、视口和结果。工具算法上线前确认 Vitest，关键用户流程确认 Playwright；未确认前不得新增依赖。文档阶段仅检查文档一致性，不执行代码构建或部署。
