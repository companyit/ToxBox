# M1-06C3 Playwright E2E 实施与验证报告

日期：2026-10-11（Asia/Shanghai）。阶段：SDD Implement → Verify。负责人确认C2 Dev Done并授权本轮浏览器测试；C3本地技术验证通过，等待人工阶段审阅。Release Ready未完成；没有进入C4、创建CI、修改生产源码、部署、commit或push。

## 环境与依赖

Node **v24.21.0**、npm **11.19.0**、macOS **26.4 (25E246)**、arm64。安装前实际查询npm注册表，@playwright/test **1.64.0**已发布，engines为Node>=20，精确传递依赖playwright1.64.0；未声明Vue/Vite peer冲突。仅新增@playwright/test、playwright、playwright-core三个1.64.0包。Vue3.5.43、Vite8.3.4、TypeScript6.0.3、Vitest4.1.11、jsdom30.0.1及原锁定包版本不变，见[依赖差异](evidence/m106c3/dependency-changes.json)。

下载前检查磁盘可用122GiB；官方dry-run提供macOS26 ARM64对应版本。使用锁定CLI官方install chromium firefox webkit成功，没有管理员系统修改或系统依赖安装。下载阶段需要网络；测试只使用loopback静态站点。

| 引擎 | 实际运行版本 | 官方revision | 最终结果 |
| --- | --- | --- | --- |
| Chromium | **156.0.8078.4** | 1248（含headless shell） | **42/42** |
| Firefox | **157.0** | 1555 | **42/42** |
| WebKit | **27.2** | 2370，mac26-arm64 | **42/42** |

实际browser.version记录在每例运行摘要中，汇总见[环境](evidence/m106c3/environment.json)与[每轮结果](evidence/m106c3/runs-summary.json)。安装日志见[browser-install.txt](evidence/m106c3/browser-install.txt)。不是品牌Chrome/Edge或真实Safari认证。

## 修改与命令

新增：playwright.config.ts、e2e/helpers.ts、e2e/pages.spec.ts、e2e/tools.spec.ts、scripts/e2e-run.mjs、本报告及evidence/m106c3/。修改：package.json/package-lock.json、tsconfig.tests.json、007的spec/design/tasks和ADR-019批准/结果记录。全部原业务源码、算法、Vite/SSG生产配置、旧测试及C2证据保持，已有未提交修改保留。

按本轮用户明确要求替代C1命令提案：

| 命令 | 当前语义 |
| --- | --- |
| npm test / npm run test | 完整build → Chromium42项 |
| npm run test:e2e | 完整build一次 → 同一产物三引擎各42项 |
| npm run test:vitest | 原默认Vitest unit+components，**151项** |
| test:unit/components/ssg/watch/legacy/inventory | 原脚本及发现归属保持；SSG独立3项 |

新增E2E与配置纳入type-check。用户要求的默认命令改变不转移任何旧身份：原 **154=151+3**；新E2E **42个逻辑用例**，三引擎是126次执行，不算126份独立覆盖，也不把重复执行和历史59项CDP加入154。

每次测试前完整SSG构建，构建失败即禁止旧产物；检查精确9HTML及ssg标记。记录源码/测试/config/lock/输出SHA，执行后核对不变；同轮三引擎共享构建。固定http://127.0.0.1:4177，预检端口、strictPort、reuseExistingServer=false；Playwright等待HTTP就绪，终止预览/浏览器，结束检查端口释放。所有实际运行轮次均释放端口，最终匹配本次浏览器revision的进程残留 **0**，见[清理核查](evidence/m106c3/process-cleanup.json)。

## 范围与实际行为

| 需求/用例 | 本轮验证 |
| --- | --- |
| TC-06 / E01（11项） | 禁JS：8正式页+3前缀404；原始SSG响应、唯一main/H1/title/description/lang、导航、noscript实际可见，工具空表单disabled |
| TC-07 / E02（8项） | 8页直接访问及刷新，独立SEO、Vue挂载，无mismatch/未捕获异常/资源加载错误 |
| TC-07 / E03（3项） | 三工具延迟入口，真实键盘不能改disabled输入；放行后原main/H1/textarea身份保持且可操作 |
| TC-07 / E04（1项） | 独立响应夹具把main改为article，公共检测器必须发现mismatch；不全局忽略警告，每例新context隔离 |
| TC-08 / E05（6项） | 三工具核心、边界/恢复/清空；JSON六顶层/2与4空格/安全整数、URL两模式四操作/单轮/无效编码；三工具复制成功/拒绝fallback/挂起防重复/clear过期反馈/离页卸载 |
| TC-08 / E06（2项） | 站内链接、直接加载、刷新、back/forward、切页空状态、h1焦点、实际308保留query/hash、6旧hash |
| TC-08 / E07（3项） | /missing/、/office/missing/、/developer/missing/实际HTTP **404**；静态+Hydration正文正确、noecho/noindex/无canonical、返回首页 |
| TC-05/08 / E08（1项） | 本次9HTML引用和SSR manifest资源存在且HTTP200，JS/CSS MIME/非空；无server/正式SEO文件；缺assets/API实际404 |
| TC-09/10/12 / E09（5项） | Tab/Enter或macOS WebKit Option+Tab、可见焦点/label/readonly/live；375/768/1440暗色视口无横溢；合成输入不进入请求/console/URL/存储；外部请求负向测试发送前被拒绝 |
| TC-07 / E10子集（2项） | en-US/zh-CN固定中文数字展示；不是完整网络故障矩阵 |

Clipboard为隔离context内注入的合成成功/失败/pending适配器，验证应用响应与实际选区，不宣称系统原生剪贴板往返。组合输入为真实浏览器中的受控合成事件，不替代系统IME。响应式为桌面视口，不替代触摸手机。HTTP结果只属于本地Vite静态预览，不证明Cloudflare。

历史59项Chrome/CDP原文件保持，逐项对应/部分覆盖/未复刻见[历史映射](evidence/m106c3/historical-cdp-mapping.json)，不冒充本轮运行。品牌Chrome、新标签页批量、保存滚动、快速导航/懒chunk故障/迟到错误、原生Clipboard、触摸模拟等历史细分证据未全部重写。N02/N03生成器故障注入、N04 jsdom专项及完整E08递归import图/E10网络故障仍开放，不把本轮核心范围写成完整007通过。

## 命令及首次失败记录

最终按用户顺序执行type-check → npm test → build → npm run test → npm run test → test:e2e，全部退出0；随后原Vitest151、SSG3、inventory154、npm audit及diff也通过。详见[最终执行账本](evidence/m106c3/commands.json)和各同名日志，审计见[audit.txt](evidence/m106c3/audit.txt)：**found 0 vulnerabilities**。

| 轮次 | 实际结果与处理 |
| --- | --- |
| Chromium首次 | 41项中30通过、11失败；Playwright通用elementText跳过NOSCRIPT。改为直接DOM textContent及子p可见性，保留正文断言 |
| Chromium第二次 | 加强节点身份断言时Node类型缺少id/tagName；type-check阻断浏览器执行，未使用已生成候选冒充通过。增加Element类型收窄 |
| Chromium第三次 | 42/42通过，包含新增外部请求拦截负向检查 |
| 三引擎首次 | 123/126；Firefox composition/fetch负向日志、WebKit键盘环境各1失败 |
| Chromium适配复验及最终三轮 | 每轮42/42 |
| 最终三引擎 | **126/126，0 skip、0 flaky、0未预期失败** |

独立[事件/焦点探针](evidence/m106c3/environment-probe.json)证明Firefox fill会产生可信compositionstart→compositionend→input，故“组合中”阶段改受控InputEvent，仍断言5个数值暂隐及结束后恢复；其他输入继续真实fill。WebKit默认Tab跳过链接，Option+Tab能聚焦skip-link，测试同样检查原焦点与Enter行为，不改系统偏好。Firefox仅在外部拦截负向用例允许精确目标URL的预期CORS诊断，仍要求1次外部请求被拒绝及0其他运行时异常；未放宽正常例的错误检测。

无真实业务缺陷需要生产修复；没有删除断言、跳过或修改算法。最初失败截图/Trace和日志保留在各唯一运行目录，后续复验不覆盖。首次记录不是最终通过记录，均见[轮次汇总](evidence/m106c3/runs-summary.json)。

## 资源、隐私与证据

最终三引擎测试约 **38.6秒**，包含构建的runner约 **40.8秒**；/usr/bin/time实际记录real约 **40.87秒**、maximum resident set size **756,973,568字节（约722MiB）**。该系统命令统计不是同时累计整个浏览器进程树的峰值，也不是产品性能数据。浏览器本次缓存约 **1.14GiB**（含Chrome/headless/Firefox/WebKit/FFmpeg），本地证据约 **16MiB**，精确du与系统见环境记录。下载未单独计时，不编造冷缓存/网络速度/性能。

每例新context与临时profile、无真实账号/cookie/草稿；仅固定合成文本，禁止把输入放标题/路径。页面外部请求被拦截并令正常例失败；负向夹具显式验证拦截。运行摘要只保留事件类型/计数，不含原输入与console正文。JSON/HTML及失败截图/Trace仅本地保存、不上传、不进入dist-ssg。对报告与解压Trace扫描私钥/AWS/OpenAI凭据模式，未发现匹配，见[隐私检查](evidence/m106c3/privacy-scan.json)。这不是通用DLP/截图OCR，不能保证任意二进制可脱敏；若出现真实敏感内容须丢弃受影响Trace，不能仅靠正则宣布清理。

## Dev Done与Release Ready

**本轮获批C3核心范围的Dev Done技术条件满足，待负责人人工审阅确认。** DD-01核心范围与追溯清楚；DD-02/03/04原回归、类型、完整构建通过；DD-05三引擎真实浏览器核心自动化通过；DD-06未发现新业务阻塞缺陷，审计0已知漏洞；DD-07失败/环境差异/遗留已登记。未自动宣称完整007或C3人工验收完成。

Release Ready继续未完成：品牌Chrome/Edge/Firefox/Safari当前及前一稳定版矩阵、真实手机、系统IME/外部Clipboard、读屏/200%缩放/完整对比度、正式性能、Cloudflare真实404/缓存/回退、正式域名/SEO产物与发布审批仍需完成。CI/workflow、远端运行、报告/Trace上传与留存策略需要独立授权。本轮停止，等待人工审查，不进入M1-06C4。

## M1-06C5A 公开证据整理说明（2026-10-11）

本报告的历史测试结果和审批证据保持。仅部分日志/环境记录的非必要本机路径脱敏；原字节保留在被忽略的本地备份，原始与公开SHA见[脱敏账本](evidence/m106c5a/redactions.json)。历史快照里的SHA仍描述当时原始文件，不改写为公开副本的SHA。Playwright原始runs只在本地保留，未进入公开提交候选，不承诺远端可访问原始截图/Trace；报告及结构化摘要继续可提交。完整提交范围见[C5A整理报告](M1-06C5A-public-submission.md)。
