# M1-06C4 GitHub Actions 实施与本地验证

日期：2026-10-11（Asia/Shanghai）。SDD Implement → Verify。负责人已确认C3 Dev Done并批准C4工作流、本地校验和规范归档。**本轮实现与本地技术检查通过，Dev Done待负责人验收；真实GitHub执行未进行，Release Ready未完成。**没有commit/push、远端工作流触发、分支保护配置或部署，不进入M2。

## 实施范围与文件

新增 `.github/workflows/quality.yml`、`scripts/ci-build.mjs`、`scripts/ci-evidence.py`、`scripts/ci-check.rb`、本报告及 `evidence/m106c4/`。修改 `scripts/e2e-run.mjs`、`e2e/tools.spec.ts`、`package.json`、`.gitignore`、ADR-019及007的spec/design/tasks。

本阶段相对执行前只更改上述既有文件；原本dirty的 `.node-version`、锁文件、006规范及C2/C3资产均保留。生产src、Vite配置、SSG生成器、154项测试/映射无变化，三个工具业务语义不变。精确对照见[初始SHA](evidence/m106c4/before.json)、[阶段变更](evidence/m106c4/changed-from-start.json)。**C4没有安装新npm依赖，也没有修改package-lock.json**；仅新增一个package脚本，npm ci验证其与锁文件兼容。

## 触发、任务与失败门禁

| 事件 | 浏览器 | 并发策略 |
| --- | --- | --- |
| 所有push、pull_request | Chromium | 同事件/同PR或ref取消过期运行 |
| 每日 `17 19 * * *` UTC | Chromium、Firefox、WebKit | run_id隔离，不取消已有批次；北京时间次日03:17 |
| workflow_dispatch | Chromium、Firefox、WebKit | run_id隔离，不取消已有批次 |

定时运行须工作流已进入默认分支；实际时间可能因平台排队延迟，不承诺准点。push与PR可能各触发一次，属于独立运行，不增加覆盖数量。

`quality`（20分钟）→ `browsers`矩阵（每任务25分钟）→稳定名称 `Quality gate`（2分钟）。quality依次：跟踪锁文件与Node pin检查、npm ci、类型、inventory、Vitest151、audit、完整build一次、SSG3、打包与敏感扫描、上传构建中转产物。浏览器needs quality成功；矩阵fail-fast=false，以保留各引擎结果。最终gate使用always检查两个上游均success，失败/取消/跳过均不能通过。无continue-on-error、退出码吞没或部署job。

CI使用 `npm run test:ci:e2e -- <引擎>` 对同一成功构建执行原E2E集，覆盖本地npm test的Chromium行为而不重复构建。原npm test/test:e2e仍完整构建；test:vitest、test:ssg、其他Vitest脚本及154身份完全保留。重复的用户验证命令在本地按要求执行，工作流不重复计数或重复跑相同suite。

## 环境、版本与安装

本地实际Node **24.21.0**、npm **11.19.0**、macOS26.4 arm64。CI固定 `ubuntu-24.04`，读取 `.node-version` 并断言24.21.0。该runner标签在[官方镜像清单](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)可用；本地锁定Playwright实现包含ubuntu24.04-x64官方支持和系统依赖表。兼容声明不等于Ubuntu实际运行证据。

| 官方Action | 已核实标签 | 固定完整commit SHA |
| --- | --- | --- |
| checkout | v5.0.0 | `08c6903cd8c0fde910a37f88322edcfb5dd907a8` |
| setup-node | v6.0.0 | `2028fbc5c25fe9cf00d9f06a71cc4710d4507903` |
| upload-artifact | v6.0.0 | `b7c566a772e6b6bfb58ed0dc250532a479d7789f` |
| download-artifact | v7.0.0 | `37930b1c2abaa49bbe596cd826c3c89aef350131` |

通过官方GitHub只读API解析标签并读取对应action.yml，四者均Node24运行时，见[元数据证据](evidence/m106c4/actions.json)。依据：[checkout](https://github.com/actions/checkout/tree/v5.0.0)、[setup-node](https://github.com/actions/setup-node/tree/v6.0.0)、[upload-artifact](https://github.com/actions/upload-artifact/tree/v6.0.0)、[download-artifact](https://github.com/actions/download-artifact/tree/v7.0.0)。Node24 Action要求新runner版本，由GitHub托管runner提供，仍待真实运行确认。

Playwright仍精确 **1.64.0**，Vitest4.1.11、Test Utils2.5.1、jsdom30.0.1及所有原锁定包不变。npm ci前确认package-lock.json在Git索引中。setup-node只缓存npm下载，以锁文件键控；每job仍npm ci，不缓存node_modules或浏览器。浏览器安装调用 `node node_modules/@playwright/test/cli.js install --with-deps "$BROWSER"`，采用锁定CLI指定的revision及官方Ubuntu系统依赖安装，无第三方脚本。本轮本地未重新下载浏览器或安装系统包。[Playwright官方CI说明](https://playwright.dev/docs/ci)支持此安装方式。

## 同一构建与预览生命周期

上游只打包dist-ssg、E08需要的SSR manifest及receipt。receipt绑定HEAD/事件commit、Node、src/e2e/tests/scripts/.github、配置/package/锁文件和每个产物SHA；其独立SHA通过job output传给下游，防止receipt与产物同时被替换却自洽。artifact名称绑定run_id/run_attempt，同次矩阵下载同一份工件，保留1天。

CI入口必须验证独立摘要、来源、manifest和产物后才能恢复dist-ssg；测试后再次核验，页面集合必须为8正式页+404且含SSG正文。公开产物不放SSR manifest、报告或server bundle。不同引擎在各自runner工作目录中恢复，不并发修改同一目录。默认本地入口的强制完整构建逻辑保持。

预览仍仅 `127.0.0.1:4177`、strictPort、reuseExistingServer=false，端口预检/HTTP就绪/退出后端口释放验证保持，失败保留非零状态。测试context隔离、worker1、retry0、外部请求发送前拒绝和异步清理规则不变。本轮各实际轮次portReleased=true；指定浏览器revision与预览进程最终残留0，见[清理记录](evidence/m106c4/process-cleanup.json)。GitHub强制取消可能无法收集完整诊断，应明确未生成，而非伪造Trace。

## 安全权限与证据

仅 `permissions: contents: read`；checkout `persist-credentials: false`，不引用secrets、PAT、写权限令牌、pull_request_target或生产环境。官方缓存/工件使用平台作用域运行令牌，无生产凭据。工作流不自动提交、推送、建Release、调用外部SaaS或部署。

上传allowlist仅 `.ci/build/`（1天）、`.ci/quality/` 和浏览器统计摘要（14天）、完整HTML/截图/Trace（7天）。HTML包含Trace副本，统一7天避免隐藏副本超过Trace期限。GitHub自身日志/step summary的保留设置不由artifact retention控制，仓库管理员须在远端核实相应策略；本轮未修改仓库设置。

扫描已知凭据模式和合成敏感标记，包含zip展开及HTML内嵌base64 zip；限制体积/嵌套、拒绝符号链接和不安全压缩路径。敏感检测失败删除待上传目录，workflow仅在扫描成功时上传。没有通用DLP、截图OCR或任意秘密可靠脱敏承诺；只使用合成输入，不接入生产数据。raw失败证据留在临时runner供当前检查，未上传内容随runner销毁，不保留至长期工件。

报告缺失会明确warning；浏览器步骤已执行却缺JSON/HTML则扫描失败，禁止静默成功。安装失败/未启动会记录未生成原因。always归档保存失败诊断；上传自身失败仍使job失败，不能覆盖核心测试失败为成功。质量步骤实际outcome写入step summary和14天工件；浏览器报告含结果、环境、产物SHA及版本诊断。

## 实际本地验证

| 检查 | 实际结果 |
| --- | --- |
| npm ci | 退出0，新增240包/审计241包、0漏洞；非依赖升级 |
| npm run type-check | 退出0 |
| npm test | Chromium42/42，完整新构建 |
| npm run build | 退出0，8正式HTML+404.html |
| npm run test ×3 | 每轮Chromium42/42，均完整新构建 |
| npm run test:vitest | 151/151（unit125+components26） |
| npm run test:ssg | 3/3，读取实际静态产物 |
| npm run test:inventory | 154唯一owner、原SHA保持；缺项/重复负向检查通过 |
| npm audit | 退出0，found 0 vulnerabilities |
| YAML/结构/权限/表达式审阅与bash语法 | Ruby/Psych解析3任务、37表达式；检查官方SHA/只读权限/依赖/留存/上传范围，bash -n通过 |
| CI复用入口三引擎 | Chromium/Firefox/WebKit各42，共126通过；无重建，37.871秒（含runner包装） |
| 最终独立摘要与GITHUB_SHA/CI环境模拟 | Chromium42/42；仅本地环境模拟，不是GitHub运行 |
| 上传前扫描与负向检查 | 21项检查通过，详见下方 |
| git diff --check | 退出0；另核查新增文本和相对链接 |

[命令账本](evidence/m106c4/commands.json)、[默认四轮摘要](evidence/m106c4/default-runs.json)、[三引擎摘要](evidence/m106c4/ci-summary.json)、[最终CI摘要](evidence/m106c4/ci-final-summary.json)、[最终receipt](evidence/m106c4/ci-final-receipt.json)、[静态检查](evidence/m106c4/static-final.txt)、[环境](evidence/m106c4/environment.json)。默认本地入口沿用C3配置的证据目录，新轮次由C4命令账本明确归档，不覆盖C3历史文件。三引擎运行目录约876KiB，构建包约332KiB；仅本地磁盘实测，无CI分钟数/峰值内存或性能评分推测。

浏览器实际沿用已安装Chromium156.0.8078.4（revision1248）、Firefox157.0（1555）、WebKit27.2（2370，macOS）；Ubuntu版本须远端报告确认。逻辑覆盖仍 **154原身份 + 42 E2E逻辑用例**。四次默认Chromium、三引擎和最终Chromium共336次E2E执行，不增加逻辑数量。skip/flaky/unexpected均0，未出现未处理异步错误。Hydration/404/SEO/三工具交互沿用完整42项断言，无删除或降低断言。

## 发现问题、修复与负向证据

1. 原npm test总会重建：新增独立CI入口，来源/commit/锁/产物双重摘要、同artifact矩阵，无重建复验通过。
2. macOS WebKit Option+Tab不应套用Linux：仅darwin使用Alt+Tab，Linux使用标准Tab；本地三引擎通过，Ubuntu键盘行为仍待真实验证。
3. 失败证据allowlist最初漏error-context.md及Trace查看器manifest.webmanifest；历史失败报告扫描首次因此失败，补齐两种实际文件类型，完整失败HTML/截图/Trace复制复验通过。该历史报告仅验证归档，未算本轮浏览器失败或通过数量。
4. Python py_compile默认缓存路径越出沙箱，首次语法检查失败；改用内存compile，本地与workflow禁额外bytecode缓存，不需系统修改。
5. npm11提示macOS可选fsevents@2.3.3安装脚本未授权；没有批准额外脚本，ci及回归均成功。此提示不是审计漏洞或功能失败。

[21项检查](evidence/m106c4/negative-checks.json)涵盖正常/敏感明文/HTML内嵌zip/缺报告/未启动提示、删除待上传副本、历史失败诊断完整保留、产物/manifest/commit/lock/独立摘要不符、缺独立CI摘要、恢复后校验，以及写权限/依赖破坏/未固定Action/continue-on-error拒绝。可复核脚本见[selfcheck.py](evidence/m106c4/selfcheck.py)；只对临时夹具和中转产物操作，不修改业务源码。不宣称该脚本验证了GitHub的真实调度、表达式执行或下游阻断。

系统无actionlint，没有安装新工具。Ruby检查只做YAML/结构与受限表达式静态检查，不是完整GitHub表达式解析器；真实平台解析和行为验收保持未执行。

## Dev Done与Release Ready

DD-01～04及本地DD-06满足当前授权实现范围；DD-05有本轮真实浏览器核心回归及已确认C3证据，DD-07遗留已登记。**本轮代码和本地技术条件满足，阶段Dev Done待负责人审阅确认；TC-11/V07真实CI行为尚未验收，不能称GitHub CI已运行通过或已强制阻断合并。**

后续经独立授权，将工作流及依赖/测试文件完整纳入仓库并推送；在真实GitHub验证push/PR/手动/定时、Ubuntu三引擎和系统依赖、失败注入阻断、取消清理、SHA拒绝、工件上传/下载/缺失及保留策略，再设置 `Quality gate` 为必需状态检查。仓库Actions启用策略、fork PR审批、配额/排队/默认分支、运行日志保留均需远端确认；本轮无相关操作。

Release Ready继续开放：品牌浏览器两个稳定主版本、真实Safari/手机、读屏/完整可访问性、系统IME/原生剪贴板、性能预算、正式域名SEO及托管404/缓存/发布审批；007已有N02/N03/N04、完整资源递归图及网络故障等缺口保持。工作流本地完成不会自动关闭这些任务，不部署、不进入M2，停止等待人工验收。

## M1-06C5A 公开证据整理说明（2026-10-11）

本报告的历史测试结果和审批证据保持。仅部分日志/环境记录的非必要本机路径脱敏；原字节保留在被忽略的本地备份，原始与公开SHA见[脱敏账本](evidence/m106c5a/redactions.json)。历史快照里的SHA仍描述当时原始文件，不改写为公开副本的SHA。Playwright原始runs只在本地保留，未进入公开提交候选，不承诺远端可访问原始截图/Trace；报告及结构化摘要继续可提交。完整提交范围见[C5A整理报告](M1-06C5A-public-submission.md)。
