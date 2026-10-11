# M1-06C2 Vitest 测试迁移执行报告

> 最终状态（2026-10-11）：安全补丁及全部指定验证通过，按负责人本轮条件验收授权，**M1-06C2 Dev Done**；**Release Ready未完成**。下方首次迁移报告、4.1.0安全告警及待验收结论保留为历史，最新结果见文末。

日期：2026-10-11。阶段：SDD Implement → Verify；获批本地迁移已执行，等待负责人验收。未进入 M1-06C3，未执行部署、commit/push、Playwright 安装/浏览器下载或 GitHub Actions。

## 环境、授权与依赖

实际 Node.js **v24.21.0**（符合 24.15.0 或更新的24.x）、npm **11.19.0**、darwin arm64。精确开发依赖：vitest **4.1.0**、@vue/test-utils **2.5.1**、jsdom **30.0.1**；安装及后续干净 `npm ci` 均退出0。锁定依赖的 Node engines 全部满足当前运行时，Vue/compiler 单一3.5.43，Vite8.3.4、TypeScript6.0.3及全部原锁定依赖版本无变化。没有新增第四个直接开发依赖；产品 engines 保留原值，测试配置独立限制 Node24>=24.15。

开始时已有 `.node-version`、ADR、006三文档修改及未跟踪的007目录，全部保留；本轮在ADR/007追加分阶段批准和结果，不重写历史审批。AGENTS早期仅9文档限制由本轮用户明确实施授权覆盖。环境、被测commit/dirty状态、版本及已知审计告警见[环境记录](evidence/m106c2/environment.json)。

## 修改文件与行为

| 文件 | 用途 |
| --- | --- |
| `package.json`、`package-lock.json` | 三包精确依赖及分层测试脚本；type-check增加测试/配置类型检查 |
| `vitest.config.ts`、`tsconfig.tests.json` | 独立Vue插件/alias、Node/jsdom/SSG项目、Node版本保护、禁止only及测试类型检查 |
| `tests/unit/{textStatistics,jsonFormatter,urlEncoder,routingSeo}.test.ts` | 109纯函数+16路由测试迁移 |
| `tests/components/{textStatistics,jsonFormatter,urlEncoder,seoDom}.test.ts` | 25交互+1head改为真实DOM测试 |
| `tests/ssg/{validators,output}.test.ts` | 2生成器校验+1实际静态产物检查 |
| `tests/helpers/{migration,domTool}.ts`、`tests/migration.json` | 原身份注册、DOM挂载/异步清理及154项唯一owner账本 |
| `scripts/test-inventory.mjs` | 设计映射、原文件SHA、Vitest实际发现与缺项/重复负向验证 |
| `docs/architecture/decisions.md`、`docs/specs/007-testing-ci/{spec,design,tasks}.md` | 本轮批准边界与实际完成记录 |
| 本报告、`docs/verification/evidence/m106c2/` | 命令日志、首次失败、环境、分支核对及被测文件SHA |

生产 `src/`、`vite.config.ts`、`scripts/ssg.mjs` 和原8份测试文件均无变更，三个工具业务行为不变。原测试不删除、不自动发现；`test:legacy`只作独立对照，不能和新测试累加。dev、build、build-only、build:csr、preview保留原用途；type-check仍检查应用，并增加测试的类型检查。npm test与npm run test是同一个有限执行脚本。没有建立尚未实施的E2E/CI脚本。

## 154项迁移结果及去重

| 原分组 | 旧身份 | 新归属 | 结果 |
| --- | ---: | --- | --- |
| TXT | 54 | unit/textStatistics | 54通过 |
| JSON | 25 | unit/jsonFormatter | 25通过 |
| URL | 30 | unit/urlEncoder | 30通过 |
| TXTC | 8 | components/textStatistics | 8通过 |
| JSONC | 8 | components/jsonFormatter | 8通过 |
| URLC | 9 | components/urlEncoder | 9通过 |
| ROUTE | 17 | unit/routingSeo 16 + components/seoDom 1 | 17通过 |
| SSG | 3 | ssg/validators 2 + ssg/output 1 | 3通过 |
| 合计 | **154** | 默认151 + 构建后3 | **154通过，0缺失、0重复、0 skip/todo** |

新Vitest实际总数仍为154，没有拆分或新增逻辑测试。默认unit125+components26=151，SSG项目独立3项；重复执行、旧runner对照和清单负向夹具均不增加覆盖数量。新测试10个文件，旧8文件继续保留。

[154项账本](../../tests/migration.json)逐项保留原文件/标题/新目标/owner/SHA；[清单验证](evidence/m106c2/inventory.txt)检查实际Vitest发现并拒绝缺项和重复身份/owner。[分支核对](evidence/m106c2/branch-audit.json)核对102个静态注册点（参数循环展开后154身份）的断言种类、顺序及内部循环表达式；head例改真实document，保留原预期并加强标签内容检查。该静态核对辅助审阅，不代替行为运行。

TXT25种空白码点各单字符/夹心断言保留；JSON/URL数值、深度、大小、UTF8、代理项和异常API循环保留。JSONC-06与URLC-08各4变更×resolve/reject共8分支保留；卸载/重挂载、源码页面集成、首页约束和禁止v-html断言保留。DOM的select值为字符串，所以缩进断言由数字2改为字符串'2'，业务默认仍为2空格。

组件直接挂载原SFC，输入/组合/change及正常按钮使用DOM事件；守卫和复制竞态保留真实VNode事件直接调用，避免仅靠disabled挡事件而遗漏底层防重复。attachTo独立容器；验证document.activeElement、实际selectionStart/End。afterEach按逆序卸载、结束受控等待、结清微任务、恢复clipboard/isSecureContext描述符与mock/timer、清空容器；head用例恢复head/lang。文件隔离、组件文件串行，无concurrent；重复运行无未处理Promise或全局污染报错。

## 实际验证

按用户顺序执行以下命令，全部退出0；完整时间/退出码见[执行账本](evidence/m106c2/commands.json)。

| 命令 | 实际结果 |
| --- | --- |
| npm run type-check | 应用、测试、配置类型检查通过 |
| npm run test（构建前） | 151/151 |
| npm run build | 类型+客户端/服务端构建+9HTML生成通过 |
| npm run test（构建后） | 151/151 |
| npm test | 151/151 |
| npm run test:ssg | 3/3，实际读取本次dist-ssg |
| npm run test:unit | 125/125 |
| npm run test:components | 26/26 |
| npm run test:legacy | 154/154，仅独立对照 |
| npm run test:inventory | 154唯一身份，缺项/重复负向检查通过 |
| git diff --check | 通过 |

迁移前另外执行原非SSG151项，151通过，见[对照基线](evidence/m106c2/legacy-before-build.txt)。正式命令日志按执行账本中的相对文件名查阅；[被测SHA](evidence/m106c2/tested-sha256.json)覆盖生产源码、新旧测试、配置/锁文件及实际SSG产物。test:watch属于持续开发命令，本轮未运行，不列作门禁通过。

SSG结果：`index.html`、`office/index.html`、`office/text-statistics/index.html`、`developer/index.html`、`developer/json-formatter/index.html`、`developer/url-encoder/index.html`、`about/index.html`、`privacy/index.html`、`404.html`，恰好9份HTML。3项SSG测试验证路径/元数据/缺正文缺资源失败、实际产物正文/head及资源存在、preview noindex且无canonical、404正文、无robots/sitemap/server入口泄漏。构建是本地生成，不是部署，也不证明真实托管HTTP状态或浏览器Hydration。

## 问题、修复与遗留

- 首轮类型检查：配置误用forbidOnly；改为Vitest实际字段allowOnly=false。第二轮将迁移后的测试纳入类型检查，发现受控Promise回调初始化、失败场景数组元组及RouteRecordRaw联合类型问题；通过明确类型和按原path/name构造测试路由替身修正，未关闭严格检查。
- 首轮行为149/151通过，两项源码集成断言被Vite转换静态 `new URL(..., import.meta.url)`，使fs收到非file URL。改为Node path.resolve读取本地源码，保留全部断言。第二轮起151通过；[首次类型失败](evidence/m106c2/type-check-first.txt)、[第二轮类型失败](evidence/m106c2/type-check-second.txt)、[首次行为失败](evidence/m106c2/test-first.txt)完整留存。
- npm审计：**2项中危**（vitest与@vitest/mocker，同一[GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)路径穿越/任意文件读取公告，报告修复版本4.1.11）。依本次精确版本授权保留4.1.0，未执行audit fix；版本调整与风险接受待负责人决定。审计退出1不混写成测试失败或审计通过。无高危/严重告警，没有发现本次业务阻塞缺陷。
- 安装提示可选fsevents install脚本未批准；npm ci及当前平台全部验证实际通过，未额外批准脚本或新增依赖。
- jsdom不证明真实浏览器布局、系统IME或原生剪贴板；本轮未重新执行浏览器验收，M1-06B历史浏览器及负责人Dev Done确认保留，不冒充本次验证。

## Dev Done与停止点

| 门禁 | 本轮判断 |
| --- | --- |
| DD-01 | 获批154项迁移实现及映射通过；完整007需求仍只完成本地子集 |
| DD-02 | 新154/旧154独立通过，唯一owner及重复运行通过 |
| DD-03 | 类型检查通过，包含新增测试/配置 |
| DD-04 | 本地生产SSG构建通过 |
| DD-05 | 本轮无新浏览器证据；业务源码不变，M1-06B历史证据由负责人评估是否可沿用 |
| DD-06 | 未发现迁移导致的业务阻塞缺陷；已知测试依赖中危告警待审阅 |
| DD-07 | 遗留已登记，等待负责人阶段审阅确认 |

**本地迁移技术检查满足；M1-06C2 Dev Done待负责人验收确认，不能自动宣布完整007 Dev Done或Release Ready。**

Playwright后续准备：另获精确@playwright/test依赖、浏览器/系统依赖下载及缓存授权；建立loopback静态preview生命周期、三引擎/Chrome矩阵、产物摘要及外部请求拒绝；实施N04和E01～10，核对历史59项Chrome/CDP行为归属并保留原证据。N02/N03的独立Node SSR、状态隔离及生成器失败/超时/残留故障注入尚未实施，涉及生成器可测试性改造须单独确认范围。CI/workflow、远端接入、报告/trace留存需各自批准，不能由本次迁移授权推定。真实Safari/手机/读屏、正式SEO/托管/性能等Release Ready缺口保持开放。

完成本轮后停止，等待人工验收，不自动进入下一阶段。

## 安全补丁与最终Dev Done验收（2026-10-11）

负责人已审阅154项迁移技术检查，授权vitest精确升级4.1.11，并明确在安全与完整回归通过后标记本阶段Dev Done。本节追加最终结果，不覆盖前文首次执行和告警记录。原证据目录文件全部保持；新证据独立位于[security-patch-4.1.11](evidence/m106c2/security-patch-4.1.11/environment.json)。

### 版本与依赖树变化

实际Node仍为v24.21.0、npm11.19.0。安装前核对npm注册表：Vitest4.1.11的Node声明为 `^20.0.0 || ^22.0.0 || >=24.0.0`，Vite peer为 `^6.0.0 || ^7.0.0 || ^8.0.0`，jsdom peer为 `*`，当前环境满足。安装后核对全部锁定包engines，0不兼容；现有Vitest配置未经修改即通过类型与运行检查。元数据及实际版本见[环境记录](evidence/m106c2/security-patch-4.1.11/environment.json)。

| 包 | 原版本 | 实际新版本 | 原因 |
| --- | --- | --- | --- |
| vitest | 4.1.0 | **4.1.11** | 负责人批准安全补丁，package精确声明 |
| @vitest/mocker | 4.1.0 | **4.1.11** | Vitest精确传递依赖，目标公告修复 |
| @vitest/expect | 4.1.0 | 4.1.11 | Vitest配套精确传递依赖 |
| @vitest/pretty-format | 4.1.0 | 4.1.11 | Vitest配套精确传递依赖 |
| @vitest/runner | 4.1.0 | 4.1.11 | Vitest配套精确传递依赖 |
| @vitest/snapshot | 4.1.0 | 4.1.11 | Vitest配套精确传递依赖 |
| @vitest/spy | 4.1.0 | 4.1.11 | Vitest配套精确传递依赖 |
| @vitest/utils | 4.1.0 | 4.1.11 | Vitest配套精确传递依赖 |

[锁文件逐包变化](evidence/m106c2/security-patch-4.1.11/dependency-changes.json)仅上述8个包，无新增或删除包；根条目同步精确声明，其余锁定条目元数据无变更。Vue3.5.43、Vite8.3.4、TypeScript6.0.3、jsdom30.0.1、Test Utils2.5.1及其他无关直接/传递依赖版本不变。未执行npm audit fix或force。

### 安全检查与干净安装

| 实际命令 | 退出码/结果 |
| --- | --- |
| npm install --save-dev --save-exact vitest@4.1.11 | 0，仅更新8个包 |
| npm ls vitest @vitest/mocker | 0，vitest4.1.11 → @vitest/mocker4.1.11 |
| npm audit | **0，found 0 vulnerabilities** |
| npm ci | 0，按更新锁文件重装成功，审计同为0 |

对应日志：[安装](evidence/m106c2/security-patch-4.1.11/install.txt)、[依赖树](evidence/m106c2/security-patch-4.1.11/npm-ls.txt)、[审计](evidence/m106c2/security-patch-4.1.11/npm-audit.txt)、[npm ci](evidence/m106c2/security-patch-4.1.11/npm-ci.txt)。GHSA-82fw-gwwq-j7x9不再影响当前依赖树，本次审计未报告其他已知漏洞；这是当前注册表审计结果，不代表不存在未知安全问题。审计和功能测试结果分别记录。

npm ci仍提示可选fsevents install脚本未批准；这是历史安装提示，未额外授权脚本，安装和全部检查实际通过。无版本冲突、安装失败或新发现的业务阻塞缺陷。

### 完整回归和SSG

在npm ci后，按用户指定顺序实际执行；每条退出0，详见[补丁命令账本](evidence/m106c2/security-patch-4.1.11/commands.json)：

| 顺序 | 命令 | 结果 |
| --- | --- | --- |
| 1 | npm run type-check | 应用、测试及配置类型检查通过 |
| 2 | npm run test | 151/151 |
| 3 | npm run test | 151/151 |
| 4 | npm run build | 类型+完整SSG构建通过 |
| 5 | npm run test | 151/151 |
| 6 | npm test | 151/151 |
| 7 | npm run test | 151/151 |
| 8 | git diff --check | 通过；归档后另复核通过 |
| 补充 | npm run test:ssg | **3/3**，针对本次实际静态产物 |
| 补充 | npm run test:inventory | **154唯一身份**，缺项/重复负向夹具被拒绝 |

总覆盖保持 **154项=默认151（unit125+components26）+SSG3**；五次默认回归均通过，重复执行不累加覆盖。0缺项、0重复owner、0 skip/todo；没有新增未处理异步错误。原测试/新测试/迁移账本/配置及业务源码与补丁前SHA相同，未删断言、改算法或修改业务行为。

本次构建仍生成8个页面及404.html，共9份HTML；SSG3项验证实际正文/head/资源、preview noindex/无canonical、404内容及禁止文件泄漏全部通过。[构建日志](evidence/m106c2/security-patch-4.1.11/build.txt)、[SSG结果](evidence/m106c2/security-patch-4.1.11/ssg.txt)、[清单结果](evidence/m106c2/security-patch-4.1.11/inventory.txt)、[补丁被测SHA](evidence/m106c2/security-patch-4.1.11/tested-sha256.json)可复核。不是生产部署或新浏览器验收。

本轮仅修改package.json、package-lock.json、本报告、007/tasks.md和ADR审批记录，另新增独立补丁证据。以[执行前文件SHA](evidence/m106c2/security-patch-4.1.11/workspace-before.json)核对，其他既有已跟踪/未跟踪文件及原证据均保持不变；升级前package/lock也在补丁目录保留。

### 最终门禁结论与剩余条件

**M1-06C2标记Dev Done；Release Ready继续未完成。** 依据本轮负责人审阅和“安全检查与全部回归通过后标记Dev Done”的明确条件授权：DD-01～04的获批迁移、自动化、类型和构建通过；DD-05沿用业务源码未变的[M1-06B历史浏览器证据](M1-06-ssg-testing.md)及负责人已审阅技术检查，不宣称本轮新浏览器验证；DD-06的已知中危公告已修复且未发现新阻塞缺陷；DD-07的遗留和范围已记录。本结论仅限M1-06C2，不关闭完整007、其他工具完整发布验收或RR门禁。

Playwright阶段仍需单独授权精确测试包、浏览器/系统依赖下载和缓存；准备loopback静态preview生命周期、三引擎/Chrome矩阵、产物摘要/外部请求限制、N04和E01～10、历史59项Chrome/CDP映射与失败证据。N02/N03生成器隔离与故障注入的具体可测试性调整仍需确认。CI/workflow、远端接入、报告/trace留存与真实Safari/手机/读屏/正式SEO/托管/性能验证保持待办。

本轮已停止，等待下一阶段授权；未安装Playwright、下载浏览器、创建GitHub Actions、修改业务算法、部署、commit/push或自动进入M1-06C3。

## M1-06C5A 公开证据整理说明（2026-10-11）

本报告的历史测试结果和审批证据保持。仅部分日志/环境记录的非必要本机路径脱敏；原字节保留在被忽略的本地备份，原始与公开SHA见[脱敏账本](evidence/m106c5a/redactions.json)。历史快照里的SHA仍描述当时原始文件，不改写为公开副本的SHA。Playwright原始runs只在本地保留，未进入公开提交候选，不承诺远端可访问原始截图/Trace；报告及结构化摘要继续可提交。完整提交范围见[C5A整理报告](M1-06C5A-public-submission.md)。
