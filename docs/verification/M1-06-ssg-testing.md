# M1-06B 静态预渲染验收归档

执行日期：2026-10-10。执行者：Codex。依据[006规格](../specs/006-ssg-testing/spec.md)、[设计](../specs/006-ssg-testing/design.md)、[任务](../specs/006-ssg-testing/tasks.md)、[双层门禁](../quality/gates.md)。本轮只实施原生SSG，不迁移测试框架、不实施CI或部署。

结论：**已批准SSG范围的Dev Done开发条件满足，提交负责人审阅确认；Release Ready未完成。** 未把前序UAT、模拟组件测试或平台未测项目追认为本轮浏览器通过。

## 实现与产物

ADR-018于2026-10-10获负责人正式批准；ADR-020的本轮静态产物、404、预览SEO与Hydration适配范围获批，正式域名/索引文件/托管发布保留待批准。ADR-019仍为草案，本轮不安装任何包，package-lock.json无修改。

新增src/app.ts、interactionReady.ts、entry-server.ts及scripts/ssg.mjs；调整main、router工厂、导航辅助、App、Header、ToolPageLayout、三个工具展示数字locale、Vite配置、HTML模板和构建脚本。三个工具utils计算模块及原151项测试未修改。精确改动见[evidence/m106/changed-files.txt](evidence/m106/changed-files.txt)。

每页新建app/router，构建端memory history，客户端web history。SSR完成后使用统一PageHead与现有Vue正文注入Vite客户端模板；SSR manifest补齐页面CSS，公开目录没有构建端入口。SSG标记使用createSSRApp且等待router ready；开发入口仍用createApp。导航DOM钩子仅onMounted注册，初始head显式同步。数字展示固定zh-CN，404分类高亮按已知路由名称判断。

ToolPageLayout用fieldset在SSR及客户端首棵树中保持disabled；App挂载完成后统一启用，相关导航不禁用。noscript在Hydration根外，禁JS仍可阅读静态正文，工具不能计算。没有重挂载降级，没有关闭Hydration错误检测；生产构建保留详细诊断。

构建命令：`npm run build`（类型检查+SSG）；`npm run build-only`（SSG）；`npm run preview`预览dist-ssg；`npm run dev`保留CSR开发；`npm run build:csr`明确生成dist中的CSR开发回退，不能作为本阶段生产候选。

```text
.ssg-build/client/        客户端构建及SSR资源清单，中间目录
.ssg-build/server/        构建端SSR bundle，中间目录
 dist-ssg/
   index.html
   office/index.html
   office/text-statistics/index.html
   developer/index.html
   developer/json-formatter/index.html
   developer/url-encoder/index.html
   about/index.html
   privacy/index.html
   404.html
   assets/                本次客户端JS/CSS
   favicon.ico
```

每次构建先删除旧候选与中间目录，顺序生成全部页面、检查结构/head/资源后才移动候选至dist-ssg。重复/非法路径、缺元数据/正文/资源、渲染错误均抛错退出，不静默回CSR。并发1、每页30秒/整体300秒是执行保护，不是实测性能承诺。生产SEO尚未授权，非preview的SSG_SEO_MODE明确拒绝；没有canonical、sitemap或robots文件。未来正式SEO实施仍须批准，不把既有纯模型测试当正式产物实现。

## 实际命令与自动化

Node v24.21.0，Vue3.5.43、Vue Router4.6.4、Vite8.3.4。工作区开始为空；没有覆盖既有未提交修改。

| 命令/检查 | 实际结果与证据 |
| --- | --- |
| `node --test tests/*.test.ts tests/*.test.mjs`（实施前） | 原151通过、0失败：[baseline.log](evidence/m106/baseline.log) |
| 最小SSR/about/ | 无window/document环境渲染成功，正文1598字符及对应head：[minimal-ssr.log](evidence/m106/minimal-ssr.log) |
| `npm run type-check` | 退出0：[type-check.log](evidence/m106/type-check.log) |
| `npm run build` | 退出0，8页+404成功：[build.log](evidence/m106/build.log) |
| `npm run build:csr` | 退出0，显式开发回退：[csr-build.log](evidence/m106/csr-build.log) |
| 最终全部Node测试 | 154通过、0失败/跳过：原151完整保留+3项SSG校验；[all-tests.log](evidence/m106/all-tests.log) |
| `SSG_SEO_MODE=production node scripts/ssg.mjs` | 预期退出1，旧候选已清除；随后完整构建恢复：[rejected-production.log](evidence/m106/rejected-production.log) |
| 重复构建 | 全部最终文件SHA与浏览器被测产物一致，无旧HTML残留：[repeat-build.log](evidence/m106/repeat-build.log)、[tested-sha256.json](evidence/m106/tested-sha256.json) |
| `git diff --check` | 退出0；不执行Git提交或推送 |

新3项测试覆盖重复名称/路径、非法点段、漏页、缺元数据、缺正文、缺资源、9个HTML集合、preview无正式SEO残留。Node结构匹配只是构建前置校验；HTML实际解析与禁JS阅读另外由真实Chrome验证。未迁移Vitest、Test Utils、Playwright/jsdom，未运行CI。逐页渲染超时、第5页抛错、扩展测试页面等全部故障注入计划尚未执行，不写通过；当前实现通过异常传播/超时终止阻断候选，不存在已知阻塞缺陷。

## 真实浏览器与证据

真实已安装Chrome154.0.8037.98，headless、独立临时配置，Darwin arm64；系统/CPU完整记录在[browser-results.json](evidence/m106/browser-results.json)。本地生产候选预览http://127.0.0.1:4177，不是Cloudflare。Node原生WebSocket/CDP驱动，无新增依赖。浏览器环境受沙箱限制，启动/本机监听经执行权限自动审批放行；Chrome显示CVDisplayLink告警，不用该环境宣称真实屏幕性能达标。

最终专项记录时间2026-10-10T14:19:04.768Z；最终回归记录时间2026-10-10T14:19:16.554Z。其后最后一次重复构建产物SHA完全相同。复制失败、加载失败、异步竞态为合成故障注入，不冒充系统权限/UAT；手机视口模拟不是手机。

| 用例 | 实际执行结果 | 证据 |
| --- | --- | --- |
| E01/Q01～03 | 禁JS直达8页及3种404入口，独立title/description/正文、唯一main/h1、noindex无canonical；正常页及404均可读 | [hydration-results.json](evidence/m106/hydration-results.json)，11项 |
| E02/Q08 | 同11个入口启JS，SSR原h1/main节点身份保持、无重复挂载；正常运行无Hydration警告或异常，404不同分类前缀一致 | 同上，11项及[hydration-events.json](evidence/m106/hydration-events.json) |
| E03/Q12 | 实际拦截三个工具客户端入口脚本；先检查disabled，尝试键入不能修改输入；放行后自动启用且可输入，没有永久禁用 | [delayed-results.json](evidence/m106/delayed-results.json)、[delayed-check.mjs](evidence/m106/delayed-check.mjs)，3项 |
| E08 | 在独立浏览器文档中故意替换SSR根子节点，检测器捕获Hydration mismatch；正常文档重新载入恢复。预期错误只属于负向夹具 | 专项第23项及事件，不修改发布文件 |
| E04/E05 | 首页三入口、8页直达/刷新/新标签、旧6个hash、无斜杠规范化、前进后退/保存滚动/焦点/通知、404返回；三工具核心算法/错误/超限/复制回退/真实Clipboard读回、卸载重入清空通过 | [browser-results.json](evidence/m106/browser-results.json)，33项；[驱动](evidence/m106/browser-check.mjs) |
| E07/001共享布局 | Header/Footer当前分类、键盘Tab/Enter子路径、375/768/1440桌面视口及375手机模拟无页面横溢、深色和AX树采集通过 | [375模拟手机截图](evidence/m106/url-375-mobile-true.png)、[深色截图](evidence/m106/url-dark.png)、[AX树](evidence/m106/accessibility.json)；非完整视觉/读屏验收 |
| E10子集 | 合成路由加载失败重试、迟到失败不覆盖当前页通过 | 33项回归中的加载故障用例；真实入口/chunk网络断连全部分支待补 |
| 本地HTTP | 未知入口返回静态404；已知无斜杠308保留query | [preview-redirect.log](evidence/m106/preview-redirect.log)。只证明本地配置，Cloudflare状态待测 |
| 原始HTML SEO/Q07 | JSON原始响应含工具页head/h1/说明和CSS；全部9HTML及manifest资源存在校验通过；不是仅动态客户端head | [raw-tool-response.html](evidence/m106/raw-tool-response.html)、SSG自动化及禁JS结果 |

浏览器实际合计59项通过：23专项、3脚本阻断、33回归；不是59种浏览器或完整发布验收。正常回归0Runtime异常，正常专项无Hydration诊断；负向夹具预期警告单列。完整多语言环境E06、各引擎、真实手机/读屏、系统IME/外部应用及性能尚未执行。

## 缺陷与复验

| 记录 | 性质、复现及修复 | 当前状态 |
| --- | --- | --- |
| DEF-006-01 | 最小SSR因retry定义在onMounted内而setup返回时不可见；将事件函数定义移到setup作用域 | 已修复；最小SSR、类型、全页构建及导航错误重试复验通过 |
| DEF-006-02 | 本地preview的后置404中间件在HTML转换前错误拦截正常页面；改为明确静态HTML优先、未知404，并为已知无斜杠地址308 | 已修复；8页直达/原始响应/404/308及Hydration通过 |

驱动问题：禁JS模式依赖requestAnimationFrame等待导致超时，改为Node轮询；404正文长度阈值错误、仅变更静态文字的负向夹具不能可靠触发诊断，分别修正为可读正文检查与结构不匹配；一次构建删除候选与浏览器测试重叠导致不可复核结果，废弃该次运行，改为稳定产物顺序执行，最终完整重测。上述中间轮次不作为通过证据；最终结果及摘要已归档。

## 门禁与遗留

DD-01：批准的SSG范围完成；DD-02：154测试通过且原151保留；DD-03：类型通过；DD-04：完整SSG成功；DD-05：真实Chrome59项核心检查通过；DD-06：已发现阻塞问题修复复验，当前已测范围无已知阻塞缺陷；DD-07：下述遗留明确记录。开发条件满足，负责人阶段确认仍需审阅本归档。

Release Ready保持未完成：

- RR-01：目标Chrome/Edge/Firefox/Safari两个主版本；本轮仅单版本真实headless Chrome。
- RR-02/03：真实手机、方向、完整键盘/200%缩放/读屏/对比度；001～005未关闭验收项继续保留，不由本轮截图或002历史UAT关闭。
- RR-04/05：完整运行时隐私/安全与真实设备工具预算、Lighthouse；未给出性能数据或90分承诺。
- RR-06/07：正式域名、生产SEO索引策略/canonical/sitemap/robots、Cloudflare直接访问/404/资源/API/缓存与HTTP状态、部署前审查与独立发布授权。
- 后续技术债务：自定义SSG维护与Node/CDP测试；框架迁移及CI仍须ADR-019审批。扩展路由需同步批准页面清单和回归，不安装第三方方案绕过问题。

本轮停止于M1-06B；未安装依赖、未改工具计算语义、未部署、未Git提交/推送，不进入M1-06C。
