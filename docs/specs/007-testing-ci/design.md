> DEV-01 文档事实核对：当前实现范围说明（拟议更新）
>
> 核对日期：2026-10-19；唯一开发仓库为 ToxBox仓库，基线 HEAD 为 `928491c9dd56f66494f47c7c8f914bb0c8deb5c4`。本说明只更新文档事实，不授权实现、依赖安装、Git 写操作、远端设置或部署。此前其他开发主线不作为当前进度与审批依据。
>
> 三个工具已实现独立试用页面；Router 4.6.4、Vitest 4.1.11、Playwright 1.64.0 已在声明、锁文件及本地安装中存在。SSG 实现 8个站点页面及404，本地 preview 支持已知路径尾斜杠重定向和未知路径 HTTP 404。客户端及静态页面使用 preview SEO（noindex、无 canonical），正式域名、sitemap/robots 与真实托管行为尚未完成验证。GitHub Actions 工作流及本地验证记录存在，远端运行和分支保护未在本轮核验。历史测试结果不等于当前 HEAD 重新执行通过。 下方资产盘点“拟加包不存在／无workflow／当前无迁移”是设计起草时事实。当前分组配置、测试入口、CI复用入口及工作流已经存在；保留原设计与比较过程，不将设计计划当作当前HEAD的执行证据。
>
> 下文历史正文及证据保留；旧阶段措辞不作为当前实现或授权的唯一依据。

# 007 统一测试与 CI 技术设计

> C3实际结果（2026-10-11）：本轮授权核心三引擎各42用例通过，原154归属保持；技术验证完成，待人工审阅。详见[C3报告](../../verification/M1-06C3-playwright-e2e.md)。完整007、CI、Release Ready及报告列明的细分缺口继续开放。

> M1-06C3（2026-10-11）当前授权：C2已确认Dev Done；实施精确Playwright1.64.0与三引擎本地E2E。用户本轮命令替代历史提案：npm test默认Chromium，test:e2e三引擎，原Vitest默认151完整保留为test:vitest，SSG3及154身份不变。根e2e/隔离发现。每次E2E先完整构建和摘要，loopback静态预览、进程清理、外部请求拦截及本地合成失败证据；真实业务缺陷只登记，生产修复另批。CI/部署/C4未授权，下文C1/C2待审批描述按历史保留。

> 当前状态（2026-10-11）：M1-06C2已获本轮本地测试迁移授权并完成技术验证，等待人工验收。下文C1待审批措辞为设计历史；完整Playwright/CI与生成器故障注入仍未实施。见[执行报告](../../verification/M1-06C2-vitest-migration.md)。

日期：2026-10-11。M1-06C1 待审批提案；当前无框架安装、配置、测试迁移或 CI 实施。关联 [spec](spec.md)、[tasks](tasks.md)、[ADR-019](../../architecture/decisions.md)。

## 实际资产与检查结论

已读 AGENTS、产品需求/路线图、前端架构/决策/质量门禁、006 三文档与验收、全部 tests 的8个文件、SSG/Vite/TS配置、package/lock 及 m106 CDP 驱动与归档。工作区开始 git status 为空。package-lock v3：Vue3.5.43、Router4.6.4、Vite8.3.4、TypeScript6.0.3、plugin-vue6.0.10、compiler-sfc3.5.43。四个拟加包在直接声明和锁文件均不存在，无 .github 工作流。

.node-version 为24，engines 当前允许 ^22.18.0 或 >=24.12.0；本次只读 process.version 为 v25.1.0，006 历史执行为 v24.21.0。两者不可混写；本轮没有用 Node25 运行验收。后续测试环境必须收窄为 Node24 >=24.15.0，建议先采用历史同版本24.21.0；安装后还须验证全部传递 engines。产品 engines 是否同步收窄为此范围纳入审批，不默认允许22或25承担测试门禁。

| 当前资产 | 数量与内容 | 迁移方式/成本 |
| --- | --- | --- |
| tests/textStatistics.test.ts | 54；U01～19、25个空白码点、4个非空白、6个边界/独立性 | 低：迁 runner，原数据和 node:assert 保留 |
| tests/jsonFormatter.test.ts | 25；J01～25，数值安全/深度/输出规模/异常 | 低：保留每个循环分支与 JSON 全局恢复 |
| tests/urlEncoder.test.ts | 30；U01～30，四操作/UTF8/代理项/上限 | 低：保留原生 API mock 清理及两个模式 |
| tests/textStatisticsInteraction.test.mjs | 8；自编译SFC+自定义renderer | 高：DOM挂载、事件、焦点、选择、异步清理重写 |
| tests/jsonFormatterInteraction.test.mjs | 8；含8种过期复制变体 | 高：同上，不能只保留正常复制 |
| tests/urlEncoderInteraction.test.mjs | 9；含模式/单轮与8种过期复制变体 | 高：同上，集成源码断言也保留 |
| tests/routingSeo.test.ts | 17；8条参数路由+9个具名测试 | 中：16项Node保留memory router；U08 DOM适配重写到jsdom |
| tests/ssg.test.mjs | 3；两个validator+一个产物集合 | 中：前2迁Vitest ssg项目的Node环境，末项保持构建后产物检查 |
| docs/verification/evidence/m106/*.mjs及结果 | 59项真实Chrome/CDP：23专项+3延迟+33回归 | 保留历史脚本/JSON/截图；重写为Playwright对应行为，不计入154；过往驱动重用固定端口/浏览器私有实例，不直接作为新runner |
| 002～005证据驱动与截图/JSON | 历史人工/浏览器材料，不是npm测试集 | 只读保留，不被Vitest/Playwright递归扫描或冒充本次通过 |

154=109算法+25交互+17路由/head+3SSG。历史154通过与59浏览器通过来源 [006验收](../../verification/M1-06-ssg-testing.md)；本轮仅静态核对数量和行为，未重新执行。无 npm test/test:*/lint 脚本；现有 dev、type-check、build、build-only、build:csr、preview 保持其意义。

SSG：scripts/ssg.mjs 清理 .ssg-build/dist-ssg，Vite双构建，检查路由/manifest，逐页SSR补CSS，验证后移动candidate；8个目录index+404.html，并发1/页30秒/整体300秒。导入脚本不触发generate。build=类型+SSG，build-only=SSG，preview只读dist-ssg；Vite preview设mpa与本地静态404/308中间件。不是Cloudflare证明。现有SSG正则检查不替代HTML DOM/HTTP验证；部分故障注入仍未实现。

## 精确依赖候选与兼容证据

2026-10-11只读查阅官方文档并读取npm官方注册表的以下固定版本（未安装）。选择明确稳定版本作为审批基线，不承诺它们是最新版本；版本变化重新记录。声明兼容是推断，本项目安装解析、TS6与运行兼容待实施验证。

| 拟新增直接 devDependency（精确值） | 用途与声明约束 | 与当前栈关系 |
| --- | --- | --- |
| vitest 4.1.0 | Node/jsdom runner；Node ^20.0.0或^22.0.0或>=24；Vite ^6/^7/^8.0.0-0 | Vite8.3.4/Node24.21满足；用默认模块转换，不启实验原生runner |
| @vue/test-utils 2.5.1 | mount原SFC、DOM事件/异步辅助；peer Vue3.x、compiler-dom3.x，可选server-renderer3.x；无engines字段 | Vue3.5.43及其同版本编译器已锁定；缺engines不是所有Node已验证 |
| jsdom 30.0.1 | 组件/head/静态HTML解析环境；Node ^22.22.2或^24.15.0或>=26；canvas为可选peer | 采用Node24>=24.15；当前Node25不满足；不安装canvas |
| @playwright/test 1.64.0 | E2E runner/断言/报告；Node>=20，依赖playwright=1.64.0 | 不依赖Vite/Vue peer，黑盒访问静态产物；三引擎另行下载 |

精确包依据：[vitest元数据](https://registry.npmjs.org/vitest/4.1.0)、[Test Utils元数据](https://registry.npmjs.org/@vue%2Ftest-utils/2.5.1)、[jsdom元数据](https://registry.npmjs.org/jsdom/30.0.1)、[Playwright Test元数据](https://registry.npmjs.org/@playwright%2Ftest/1.64.0)。[Vitest4.1发布说明](https://vitest.dev/blog/vitest-4-1.html)明确支持Vite8；[Test Utils指南](https://test-utils.vuejs.org/guide/)说明Vue组件挂载。

只新增上述四个直接包；不另装playwright、playwright-core、@vue/compiler-sfc、@vue/server-renderer、@vitest/browser-playwright、UI/coverage、serve/wait-on包。Vue已有同版本编译器；Test Utils peer解析需安装后核对不引入Vue多副本。使用jsdom项目提供的document/DOMParser，不在TS直接import JSDOM，故当前方案不需要@types/jsdom；若实施发现必须直接导入，再审批类型包。使用既有plugin-vue编译SFC，显式alias指向src；独立Vitest配置不加载DevTools/preview中间件。测试TS独立noEmit配置纳入type-check，不以Vitest或Playwright转译代替类型检查。

## 模块、数据流与隔离

规划目录：tests/unit/*.test.ts（Node算法/路由/生成器）、tests/components/*.test.ts（jsdom SFC/head）、tests/ssg/*.test.ts（构建后Node产物）、tests/e2e/*.spec.ts（Playwright）；tests/fixtures只放合成输入与负向HTML。vitest.config.ts定义unit、components、ssg命名projects；ssg不包含于默认npm test。playwright.config.ts只匹配tests/e2e/**/*.spec.ts。新增配置、测试辅助和报告目录都尚不存在。

数据流：合成样本→纯函数/组件断言；源码+锁文件→一次SSG→摘要/HTML静态检查→loopback preview→隔离browser context→结果/敏感扫描→报告。纯函数保持Node环境，不为每项加载jsdom；组件挂载attachTo独立容器，afterEach卸载/清空body/head、恢复mock/global/property descriptor、真实计时器并结清受控Promise。head DOM用例清理title/lang与管理标签。全局API替换用例不可concurrent；文件/worker隔离，SSG变更目录用例串行。

Node SSR隔离检查通过独立进程移除window/document/navigator后导入本次server bundle（Node24本身可能带navigator），不靠jsdom/mock掩盖非法访问。生成器负向夹具使用临时目录/子进程，不让失败注入删除E2E正在读取的dist-ssg；需要重定向输出/超时注入的生成器可测试性改动必须单列后续授权，不能本轮改业务。正常E2E前后都核对产物摘要，期间不得重新构建。

## 迁移、保留、重写与去重

迁移表示只改runner/import/生命周期，输入/预期/断言继续保留；重写表示替换自定义渲染器或假DOM为标准挂载，业务预期不变；保留表示迁移前旧资产完整可复核，以及历史CDP证据不删除；新增表示154之外的新身份。

旧身份定义为“源文件+原test标题”，现有循环注册的每个展开项独立身份；同一test内部循环的分支不是额外用例数量，但必须全部迁移。下方完整映射保留154个身份；短ID前缀防止不同文件U01/C01冲突。目标标题使用该短ID，原标题保留在迁移账本。

分组迁移：109算法→16路由→1head DOM→25交互→3SSG。旧测试原位保留为只读对照，新测试进入明确目录；旧Node只用显式8文件清单，Vitest只扫新目录，禁止node --test tests/**/*.test.*。正常门禁只统计owner；test:legacy仅对照，不能被test:ci嵌套执行并合并计数。迁移中未完成组由旧runner持有owner，已迁组由Vitest持有owner，清单检查拒绝0或2个owner。全部完成后npm test只跑Vitest，不导入node:test；旧文件可保留但不自动发现，删除需要覆盖审阅后的独立明确确认。本方案没有“迁移完成即删除”动作。

最终154身份在默认unit/components有151、构建后ssg有3；新增另列。参数展开、拆分旧test、浏览器重复或retry只增加执行次数，不增加旧身份覆盖。skip/todo/缺二进制/空suite非通过。每组记录旧→新输入、断言及分支核对、两次独立命令/版本/退出码，不能仅数量相等视为等价。

## 本地命令契约（全部是拟新增脚本）

用户请求中的重复“test”按常用分层命名细化如下，不创建同名JSON键。

| 命令 | 拟脚本内容/前置条件 |
| --- | --- |
| npm test | vitest run --project unit --project components；有限执行，无watch、无构建、无浏览器下载 |
| npm run test:unit | vitest run --project unit |
| npm run test:components | vitest run --project components |
| npm run test:watch | vitest --project unit --project components；仅本地持续模式 |
| npm run test:ssg | vitest run --project ssg；要求本次完整SSG及摘要存在，缺失失败 |
| npm run test:e2e | playwright test --project chromium；要求完整SSG，自动启动本地preview，缺产物失败 |
| npm run test:e2e:all | playwright test --project chromium --project firefox --project webkit；同一产物 |
| npm run test:e2e:chrome | playwright test --project chrome；已安装品牌Chrome，缺失失败、单列证据 |
| npm run test:ci | 顺序 type-check → npm test → build-only → test:ssg → test:e2e；任一步非零即停止 |
| npm run test:legacy | node --test 显式列出本节资产表8个旧文件；仅迁移对照，SSG需先构建 |
| npm run test:inventory | 规划Node只读清单脚本，对照154身份、owner/分支映射、runner发现结果；重复/漏项失败 |
| npm run test:browsers:install | playwright install chromium firefox webkit；显式独立安装，获下载授权后使用 |

test:ci的顺序组合可用npm已有脚本能力，不增加编排包。test:ssg只验证不重建；test:e2e绝不自动切换CSR dev server。完整本地顺序为Node版本检查→获批安装/下载（首次）→npm run test:inventory→npm run test:ci→npm run test:e2e:all，Chrome通道按可用设备单独执行。CI在npm ci后执行同等门禁；不调用npm install改锁。

## Playwright产物、浏览器与执行范围

baseURL固定http://127.0.0.1:4177，不接受任意远端覆盖；webServer用npm run preview -- --host 127.0.0.1 --port 4177 --strictPort，reuseExistingServer=false（本地/CI均如此），启动超时60秒。先验证9HTML集合/ssg标记/摘要，端口冲突失败，不连接未知已有服务器。需要检测404就请求真实未知路径，不能只点击站内404。

| 项目 | PR门禁 | 夜间/手动扩展 | 范围 |
| --- | --- | --- | --- |
| Chromium（随1.64.0锁定） | 全部E01～E10 | 全部 | 禁JS/启JS、3工具、8页/404、资源/隐私、视口/locale |
| Firefox（Playwright构建） | 不默认执行，记录未测 | 全部E01～E10 | 与Chromium相同业务断言，权限差异用跨引擎故障夹具 |
| WebKit（Playwright构建） | 不默认执行，记录未测 | 全部E01～E10 | 同上，Linux自动化引擎不代表Safari |
| chrome品牌通道 | 本地可用时核心E02/03/04/05/07 | 手动可用设备同核心 | 真实Chrome版本另报，不自动安装系统Chrome |

三引擎桌面1440为完整基线；E09在375/768/1440、明暗模式及375触摸模拟执行，E10两locale复用相同产物。每个逻辑E ID下参数用例独立标题，不以三引擎乘数宣传新增覆盖。CI workers=1，retries=0、forbidOnly=true；后续诊断重跑单列，不覆盖首轮失败。单例30秒/断言5秒、E2E globalTimeout15分钟、CI job25分钟为待批初始保护值，不是实测时长。

所有浏览器context新建、serviceWorkers=block；context路由仅允许该loopback origin（本地fixture、data/blob内部资源另明确），外部请求中止并记录用例失败；不跟随公共URL。APIRequestContext的HTTP检查另校验URL/重定向目标为loopback，不假定page路由能拦它。example.com/test.invalid仅字符串，不访问。依赖/二进制下载阶段需要网络，测试阶段无需公共网站/生产服务器。

### 新增固定验收用例

| ID | 操作与断言 | 对应需求 |
| --- | --- | --- |
| N01 | 清单收集154旧身份，缺一/重复owner负向样本必须失败；新旧runner发现路径互斥 | TC-02/03 |
| N02 | Node24无浏览器全局逐页SSR，不同顺序两次生成，三工具空状态/head不串页 | TC-05 |
| N03 | 临时候选注入漏页/第5页render抛错/超时/manifest缺资源，非零退出且无本次成功候选；两次构建无旧残留 | TC-05 |
| N04 | jsdom挂载ToolPageLayout ready=false→true，控件disabled转换，导航仍可用；重复挂载清理全局 | TC-04/07 |
| E01 | 禁JS读取8页及/missing/、/office/missing/、/developer/missing/；原始HTML与DOM唯一head/main/h1/lang、正文/导航/规则、noscript、空表单disabled | TC-06 |
| E02 | 在导航前监听console/pageerror；拦截并延迟客户端入口，保存原main/h1/textarea引用；放行后比较节点身份、数量/单次响应、head与初始焦点 | TC-07 |
| E03 | 三工具延迟期间用真实键盘尝试输入无变化；放行后启用并操作；拒绝脚本时仍有可读正文且不能产生会丢失的输入 | TC-07 |
| E04 | 独立response夹具改SSR根子树结构（历史仅改文字不可靠）；公共检测器应报告mismatch，隔离夹具中断言检测结果为失败，再载正常产物恢复；不允许全局忽略警告 | TC-07 |
| E05 | 三工具各正常/中文Emoji/错误/超限/恢复/示例守卫/清空焦点；JSON六顶层、2/4空格、安全数值；URL两模式四操作、单轮/无效UTF8；Clipboard成功/失败/pending卸载 | TC-08 |
| E06 | 已知深层直达/刷新/新页；无斜杠308保留合成query/hash、无循环；站内后退/前进、6旧hash、保存滚动/焦点通知、切页清空 | TC-08 |
| E07 | 3前缀未知路径HTTP404+静态/启JS404、不回显路径、无canonical/noindex；/404.html状态单列，不要求必须404；缺assets及/api/v1/非200；验证状态/Content-Type/响应体 | TC-08 |
| E08 | 解析9HTML全部script/link引用和构建manifest，资源存在且HTTP可读/MIME正确；递归静态import及动态chunk可达、路由CSS与样式加载；无server bundle/报告/旧正式SEO文件泄漏 | TC-05/08 |
| E09 | 三视口/明暗/触摸模拟、长输出无横溢；Tab/Enter完整核心操作、可见焦点/标签/反馈；输入合成标记后查请求/URL/console/存储无内容泄漏，禁外部请求 | TC-08/09/10/12 |
| E10 | en-US/zh-CN固定locale一致；入口/chunk阻断、快速导航/迟到错误、重试恢复，中文可感知错误，不静默重挂载 | TC-07/08/09 |
| C01 | 干净npm ci/冷缓存三引擎；缺二进制/首层故意失败/产物SHA改变均使门禁失败或下游阻断 | TC-01/10/11 |
| C02 | 构造合成“密钥”标记验证报告扫描会拒绝上传；检查报告/trace独立留存与删除路径，无生产凭据 | TC-12 |

E08先产物解析再HTTP，不把浏览器未请求的懒chunk视为已验证；manifest检查读.ssg-build/client，公开目录不复制manifest/server。HTTP与客户端路由404分开。Hydration诊断使用现有__VUE_PROD_HYDRATION_MISMATCH_DETAILS__标志和节点身份；负向测试断言检测器拒绝，不让测试套件故意保持红灯。敏感信息检测也只使用合成标记。

### 浏览器安装、缓存与资源

按[Playwright浏览器文档](https://playwright.dev/docs/browsers)使用本地锁定CLI；npm ci与浏览器安装分开，禁止npx自动临时下载latest。首次本地可只安装chromium，完整验证前显式安装firefox/webkit；测试时不自动补下载。macOS默认~/Library/Caches/ms-playwright，Linux默认~/.cache/ms-playwright；若使用PLAYWRIGHT_BROWSERS_PATH，安装与运行一致，放用户缓存而非仓库/公开产物。下载或写沙箱外缓存、Linux系统依赖需明确授权。

本地跨项目可复用匹配revision，版本升级后由CLI管理旧revision；离线先准备匹配包与二进制。CI初期不缓存浏览器（官方[CI指南](https://playwright.dev/docs/ci)认为恢复收益有限、系统依赖不随缓存恢复），只缓存npm下载缓存，仍npm ci，不缓存node_modules。未来缓存浏览器须按OS/架构/Playwright版本+lock哈希键控，不用宽泛fallback；命中后检查revision且仍安装系统依赖，损坏就显式重装或失败，不能跳过测试。

Linux CI获批后用锁定playwright install --with-deps chromium（扩展安装三者），Ubuntu24.04作为初始平台候选，实施时确认该版本支持列表。不替换用户系统浏览器。三引擎规划磁盘2～4GiB、本地/CI运行内存2～4GiB、工件单轮<=200MiB作容量规划，均未测；超限先定位/审批调整，不裁剪行为覆盖。首次下载耗时/CI分钟数取决于网络与配额，实施留实测。worker1控制峰值；SSG双构建一次复用，负向构建串行增加时间。

## CI与证据

仅设计GitHub Actions：PR→quality job（Node24版本断言、npm ci、清单、测试TS/业务类型、151+新增回归）→artifact job（一次build-only、3+新增SSG、摘要、打包静态产物）→Chromium job（needs前置、下载同一SHA产物、安装chromium、E01～10）。夜间/手动基于同一提交重走质量与构建后，把同一artifact提供三引擎矩阵，各worker1，不各自重建。测试前后SHA一致，不能复用未核对旧dist或并行清理它。

Node采用24.21.0为初始明确patch并记录npm版本，后续Node24安全patch更新另审；必须>=24.15.0，不写lts/*。Actions选受信任官方checkout/setup-node/upload/download-artifact并在实施时固定完整commit SHA，仓库权限contents:read，禁持久凭据；不使用pull_request_target执行PR代码。PR、nightly、workflow_dispatch和分支保护所需仓库/分支名称由负责人批准；工作流创建与真实GitHub执行可分阶段授权，本地通过不等于CI通过。不包含部署job、生产环境或生产密钥；只使用平台最小权限自动token（不是生产token）。

Vitest JSON/JUnit、Playwright HTML/JSON/JUnit、失败screenshot=only-on-failure、trace=retain-on-failure，默认video=off，目录在公开产物外。记录用例ID、命令/退出码、UTC时间与本地日期、OS/架构、Node/npm/引擎具体版本、commit+dirty diff摘要（不自动上传完整可能敏感的补丁）、lockSHA、SSG文件SHA、失败首轮及未执行项。逻辑身份与每引擎执行数分开报，154不包含E2E与新N/C项。

仅合成夹具/临时浏览器profile，无真实账号、cookie、工具草稿或生产URL；禁止把输入加入测试标题/文件名/错误日志。报告默认可能带DOM/网络/console内容，上传前扫描敏感标记/凭据/非loopback地址并用白名单控制文件。发现真实敏感内容：停止上传，删除本地及已上传受影响工件，记录不含原文的事件及范围；trace二进制不能可靠脱敏时整份丢弃，不宣称正则足以清洗。CI成功/失败摘要及报告/截图14天、失败trace独立工件7天待批准；本地临时profile运行后清除，失败证据到期明确清理，历史UAT文档不按临时缓存自动删。失败时尽力导出/上传合规报告，不因测试失败跳过证据；取消/启动失败无trace时记录原因。

## 风险、证据边界与审批

jsdom不做布局/系统IME/原生权限/读屏保证；DOM事件模拟和focus/select仅验证组件契约，系统输入法、跨应用剪贴板仍需真实设备。Playwright捆绑Firefox/WebKit是自动化构建，Chromium不等于品牌Chrome/Edge；触摸/视口模拟不是真手机，WebKit不是真Safari，不能满足RR的两个主版本矩阵。真机证据需型号/系统/品牌浏览器精确版本、视口方向、日期/步骤/结果/截图、测试产物SHA；真实Chromeheadless只能作为其记录环境证据。三引擎绿灯不等于Release Ready。

主要风险：TS6类型集成未经项目实测；jsdom新主版本/传递engines；Test Utils compiler peer可能重复；旧渲染器直接调handler与disabled DOM事件不同；fake timers/microtask/clipboard跨例泄漏；Hydration能自恢复导致假阳性；并发构建破坏候选；CI下载/系统包失败、引擎平台差异与工件泄漏。缓解为精确锁版本+Node前置、分组分支核对、DOM状态断言与底层防重复契约共同保留、独立清理、结构负向检测、单次产物/串行故障夹具、失败阻断/独立留证。发现不兼容先停相关任务并更新ADR，不擅升框架或删除测试。

ADR待批项目：D019-01四包精确版本/Node24范围；D019-02迁移账本、owner及旧文件保留；D019-03命令/SSG夹具可测试性调整；D019-04三引擎范围/下载与系统安装/缓存；D019-05工作流范围、GitHub接入/分支保护；D019-06工件权限、14/7天留存、资源/超时参数。全部获得明确实施授权前不得编码。批准框架安装不自动授权生产部署、commit/push或远端执行。

## 154项完整迁移映射

下表目标为未来路径，不代表已创建。每行唯一对应一个现有test注册项，原文件由前缀确定；标题保留原文用于逐项审阅。

| 旧身份 | 原文件（tests/下）与原标题 | 新目标（tests/下，标题带旧身份） | 处理 |
| --- | --- | --- | --- |
| TXT-01 | textStatistics.test.ts：U01 | unit/textStatistics.test.ts | 迁移 |
| TXT-02 | textStatistics.test.ts：U02 | unit/textStatistics.test.ts | 迁移 |
| TXT-03 | textStatistics.test.ts：U03 | unit/textStatistics.test.ts | 迁移 |
| TXT-04 | textStatistics.test.ts：U04 | unit/textStatistics.test.ts | 迁移 |
| TXT-05 | textStatistics.test.ts：U05 | unit/textStatistics.test.ts | 迁移 |
| TXT-06 | textStatistics.test.ts：U06 | unit/textStatistics.test.ts | 迁移 |
| TXT-07 | textStatistics.test.ts：U07 | unit/textStatistics.test.ts | 迁移 |
| TXT-08 | textStatistics.test.ts：U08 | unit/textStatistics.test.ts | 迁移 |
| TXT-09 | textStatistics.test.ts：U09 | unit/textStatistics.test.ts | 迁移 |
| TXT-10 | textStatistics.test.ts：U10 | unit/textStatistics.test.ts | 迁移 |
| TXT-11 | textStatistics.test.ts：U11 | unit/textStatistics.test.ts | 迁移 |
| TXT-12 | textStatistics.test.ts：U12 | unit/textStatistics.test.ts | 迁移 |
| TXT-13 | textStatistics.test.ts：U13 | unit/textStatistics.test.ts | 迁移 |
| TXT-14 | textStatistics.test.ts：U14 | unit/textStatistics.test.ts | 迁移 |
| TXT-15 | textStatistics.test.ts：U15 | unit/textStatistics.test.ts | 迁移 |
| TXT-16 | textStatistics.test.ts：U16 | unit/textStatistics.test.ts | 迁移 |
| TXT-17 | textStatistics.test.ts：U17 | unit/textStatistics.test.ts | 迁移 |
| TXT-18 | textStatistics.test.ts：U18 | unit/textStatistics.test.ts | 迁移 |
| TXT-19 | textStatistics.test.ts：U19 | unit/textStatistics.test.ts | 迁移 |
| TXT-20 | textStatistics.test.ts：W U+9 | unit/textStatistics.test.ts | 迁移 |
| TXT-21 | textStatistics.test.ts：W U+a | unit/textStatistics.test.ts | 迁移 |
| TXT-22 | textStatistics.test.ts：W U+b | unit/textStatistics.test.ts | 迁移 |
| TXT-23 | textStatistics.test.ts：W U+c | unit/textStatistics.test.ts | 迁移 |
| TXT-24 | textStatistics.test.ts：W U+d | unit/textStatistics.test.ts | 迁移 |
| TXT-25 | textStatistics.test.ts：W U+20 | unit/textStatistics.test.ts | 迁移 |
| TXT-26 | textStatistics.test.ts：W U+a0 | unit/textStatistics.test.ts | 迁移 |
| TXT-27 | textStatistics.test.ts：W U+1680 | unit/textStatistics.test.ts | 迁移 |
| TXT-28 | textStatistics.test.ts：W U+2000 | unit/textStatistics.test.ts | 迁移 |
| TXT-29 | textStatistics.test.ts：W U+2001 | unit/textStatistics.test.ts | 迁移 |
| TXT-30 | textStatistics.test.ts：W U+2002 | unit/textStatistics.test.ts | 迁移 |
| TXT-31 | textStatistics.test.ts：W U+2003 | unit/textStatistics.test.ts | 迁移 |
| TXT-32 | textStatistics.test.ts：W U+2004 | unit/textStatistics.test.ts | 迁移 |
| TXT-33 | textStatistics.test.ts：W U+2005 | unit/textStatistics.test.ts | 迁移 |
| TXT-34 | textStatistics.test.ts：W U+2006 | unit/textStatistics.test.ts | 迁移 |
| TXT-35 | textStatistics.test.ts：W U+2007 | unit/textStatistics.test.ts | 迁移 |
| TXT-36 | textStatistics.test.ts：W U+2008 | unit/textStatistics.test.ts | 迁移 |
| TXT-37 | textStatistics.test.ts：W U+2009 | unit/textStatistics.test.ts | 迁移 |
| TXT-38 | textStatistics.test.ts：W U+200a | unit/textStatistics.test.ts | 迁移 |
| TXT-39 | textStatistics.test.ts：W U+2028 | unit/textStatistics.test.ts | 迁移 |
| TXT-40 | textStatistics.test.ts：W U+2029 | unit/textStatistics.test.ts | 迁移 |
| TXT-41 | textStatistics.test.ts：W U+202f | unit/textStatistics.test.ts | 迁移 |
| TXT-42 | textStatistics.test.ts：W U+205f | unit/textStatistics.test.ts | 迁移 |
| TXT-43 | textStatistics.test.ts：W U+3000 | unit/textStatistics.test.ts | 迁移 |
| TXT-44 | textStatistics.test.ts：W U+feff | unit/textStatistics.test.ts | 迁移 |
| TXT-45 | textStatistics.test.ts：non-W U+85 | unit/textStatistics.test.ts | 迁移 |
| TXT-46 | textStatistics.test.ts：non-W U+180e | unit/textStatistics.test.ts | 迁移 |
| TXT-47 | textStatistics.test.ts：non-W U+200b | unit/textStatistics.test.ts | 迁移 |
| TXT-48 | textStatistics.test.ts：non-W U+200d | unit/textStatistics.test.ts | 迁移 |
| TXT-49 | textStatistics.test.ts：100000 ASCII code units accepted | unit/textStatistics.test.ts | 迁移 |
| TXT-50 | textStatistics.test.ts：100001 ASCII code units rejected without stale results | unit/textStatistics.test.ts | 迁移 |
| TXT-51 | textStatistics.test.ts：50000 Emoji fit the code-unit limit | unit/textStatistics.test.ts | 迁移 |
| TXT-52 | textStatistics.test.ts：Emoji limit plus one code unit rejected | unit/textStatistics.test.ts | 迁移 |
| TXT-53 | textStatistics.test.ts：CRLF and adjacent line boundaries | unit/textStatistics.test.ts | 迁移 |
| TXT-54 | textStatistics.test.ts：repeated calls have independent results | unit/textStatistics.test.ts | 迁移 |
| JSON-01 | jsonFormatter.test.ts：J01 empty and JSON whitespace for all actions | unit/jsonFormatter.test.ts | 迁移 |
| JSON-02 | jsonFormatter.test.ts：J02 non-JSON whitespace | unit/jsonFormatter.test.ts | 迁移 |
| JSON-03 | jsonFormatter.test.ts：J03 exact indentation | unit/jsonFormatter.test.ts | 迁移 |
| JSON-04 | jsonFormatter.test.ts：J04 arrays | unit/jsonFormatter.test.ts | 迁移 |
| JSON-05 | jsonFormatter.test.ts：J05 string and number | unit/jsonFormatter.test.ts | 迁移 |
| JSON-06 | jsonFormatter.test.ts：J06 false null zero and true remain outputs | unit/jsonFormatter.test.ts | 迁移 |
| JSON-07 | jsonFormatter.test.ts：J07 illegal structures | unit/jsonFormatter.test.ts | 迁移 |
| JSON-08 | jsonFormatter.test.ts：J08 invalid primitives and multiple roots | unit/jsonFormatter.test.ts | 迁移 |
| JSON-09 | jsonFormatter.test.ts：J09 surrounding JSON whitespace | unit/jsonFormatter.test.ts | 迁移 |
| JSON-10 | jsonFormatter.test.ts：J10 nested exact output | unit/jsonFormatter.test.ts | 迁移 |
| JSON-11 | jsonFormatter.test.ts：J11 internal spaces | unit/jsonFormatter.test.ts | 迁移 |
| JSON-12 | jsonFormatter.test.ts：J12 duplicate and escaped duplicate names | unit/jsonFormatter.test.ts | 迁移 |
| JSON-13 | jsonFormatter.test.ts：J13 safe boundaries | unit/jsonFormatter.test.ts | 迁移 |
| JSON-14 | jsonFormatter.test.ts：J14 reject unsafe conversion, allow syntax validation | unit/jsonFormatter.test.ts | 迁移 |
| JSON-15 | jsonFormatter.test.ts：J15 finite range | unit/jsonFormatter.test.ts | 迁移 |
| JSON-16 | jsonFormatter.test.ts：J16 decimal loss, underflow and representation are explicit native semantics | unit/jsonFormatter.test.ts | 迁移 |
| JSON-17 | jsonFormatter.test.ts：J17 Unicode escaped and emoji | unit/jsonFormatter.test.ts | 迁移 |
| JSON-18 | jsonFormatter.test.ts：J18 escapes and literal newline | unit/jsonFormatter.test.ts | 迁移 |
| JSON-19 | jsonFormatter.test.ts：J19 lone surrogate and no normalization | unit/jsonFormatter.test.ts | 迁移 |
| JSON-20 | jsonFormatter.test.ts：J20 proto is own data and index keys reorder | unit/jsonFormatter.test.ts | 迁移 |
| JSON-21 | jsonFormatter.test.ts：J21 UTF16 limits ASCII and emoji | unit/jsonFormatter.test.ts | 迁移 |
| JSON-22 | jsonFormatter.test.ts：J22 depth and quotes | unit/jsonFormatter.test.ts | 迁移 |
| JSON-23 | jsonFormatter.test.ts：J23 output guard exact boundary and actual expansion | unit/jsonFormatter.test.ts | 迁移 |
| JSON-24 | jsonFormatter.test.ts：J24 unexpected failures sanitized and recover | unit/jsonFormatter.test.ts | 迁移 |
| JSON-25 | jsonFormatter.test.ts：J25 overwritten values and deterministic error priority | unit/jsonFormatter.test.ts | 迁移 |
| URL-01 | urlEncoder.test.ts：U01 empty is not an error and avoids native APIs | unit/urlEncoder.test.ts | 迁移 |
| URL-02 | urlEncoder.test.ts：U02 unescaped set | unit/urlEncoder.test.ts | 迁移 |
| URL-03 | urlEncoder.test.ts：U03 Chinese | unit/urlEncoder.test.ts | 迁移 |
| URL-04 | urlEncoder.test.ts：U04 Emoji | unit/urlEncoder.test.ts | 迁移 |
| URL-05 | urlEncoder.test.ts：U05 component reserved | unit/urlEncoder.test.ts | 迁移 |
| URL-06 | urlEncoder.test.ts：U06 URI reserved | unit/urlEncoder.test.ts | 迁移 |
| URL-07 | urlEncoder.test.ts：U07 brackets | unit/urlEncoder.test.ts | 迁移 |
| URL-08 | urlEncoder.test.ts：U08 reserved decoding | unit/urlEncoder.test.ts | 迁移 |
| URL-09 | urlEncoder.test.ts：U09 preserved escape case | unit/urlEncoder.test.ts | 迁移 |
| URL-10 | urlEncoder.test.ts：U10 space and plus encode | unit/urlEncoder.test.ts | 迁移 |
| URL-11 | urlEncoder.test.ts：U11 whitespace is content | unit/urlEncoder.test.ts | 迁移 |
| URL-12 | urlEncoder.test.ts：U12 plus never means form space | unit/urlEncoder.test.ts | 迁移 |
| URL-13 | urlEncoder.test.ts：U13 invalid percent sequences | unit/urlEncoder.test.ts | 迁移 |
| URL-14 | urlEncoder.test.ts：U14 truncated UTF8 | unit/urlEncoder.test.ts | 迁移 |
| URL-15 | urlEncoder.test.ts：U15 invalid UTF8 | unit/urlEncoder.test.ts | 迁移 |
| URL-16 | urlEncoder.test.ts：U16 encoded surrogate fails | unit/urlEncoder.test.ts | 迁移 |
| URL-17 | urlEncoder.test.ts：U17 lower-case escapes | unit/urlEncoder.test.ts | 迁移 |
| URL-18 | urlEncoder.test.ts：U18 percent once | unit/urlEncoder.test.ts | 迁移 |
| URL-19 | urlEncoder.test.ts：U19 existing escape is encoded | unit/urlEncoder.test.ts | 迁移 |
| URL-20 | urlEncoder.test.ts：U20 repeated decode requires manual input | unit/urlEncoder.test.ts | 迁移 |
| URL-21 | urlEncoder.test.ts：U21 repeated encode | unit/urlEncoder.test.ts | 迁移 |
| URL-22 | urlEncoder.test.ts：U22 raw URI is not parsed or validated | unit/urlEncoder.test.ts | 迁移 |
| URL-23 | urlEncoder.test.ts：U23 lone surrogate encode fails | unit/urlEncoder.test.ts | 迁移 |
| URL-24 | urlEncoder.test.ts：U24 raw surrogate decode is native passthrough | unit/urlEncoder.test.ts | 迁移 |
| URL-25 | urlEncoder.test.ts：U25 HTML remains a string | unit/urlEncoder.test.ts | 迁移 |
| URL-26 | urlEncoder.test.ts：U26 ASCII size boundary avoids API on excess | unit/urlEncoder.test.ts | 迁移 |
| URL-27 | urlEncoder.test.ts：U27 Emoji code units and maximum expansion | unit/urlEncoder.test.ts | 迁移 |
| URL-28 | urlEncoder.test.ts：U28 exact decode size | unit/urlEncoder.test.ts | 迁移 |
| URL-29 | urlEncoder.test.ts：U29 unexpected and URIError sanitized then recovered | unit/urlEncoder.test.ts | 迁移 |
| URL-30 | urlEncoder.test.ts：U30 no Unicode normalization, controls, no recursive repair | unit/urlEncoder.test.ts | 迁移 |
| TXTC-01 | textStatisticsInteraction.test.mjs：empty/example/nonempty guard/clear | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| TXTC-02 | textStatisticsInteraction.test.mjs：composition hides stale numbers until compositionend | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| TXTC-03 | textStatisticsInteraction.test.mjs：over limit preserves text and invalidates results, then recovers | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| TXTC-04 | textStatisticsInteraction.test.mjs：clipboard missing selects full text even above limit | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| TXTC-05 | textStatisticsInteraction.test.mjs：clipboard rejection preserves input and shows fallback | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| TXTC-06 | textStatisticsInteraction.test.mjs：clipboard success copies exact text | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| TXTC-07 | textStatisticsInteraction.test.mjs：pending copy cannot overwrite clear feedback or submit twice | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| TXTC-08 | textStatisticsInteraction.test.mjs：unmount during pending clipboard promise is safe | components/textStatistics.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-01 | jsonFormatterInteraction.test.mjs：C01 edit invalidates immediately, illegal and over-limit inputs retained | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-02 | jsonFormatterInteraction.test.mjs：C02 composition prevents execution and never auto-parses | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-03 | jsonFormatterInteraction.test.mjs：C03 indent change, minify independence, validate has no output | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-04 | jsonFormatterInteraction.test.mjs：C04 guarded sample and clear reset/focus | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-05 | jsonFormatterInteraction.test.mjs：C05 successful result copy and failure variants select output | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-06 | jsonFormatterInteraction.test.mjs：C06 stale success/failure never changes new results or focus | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-07 | jsonFormatterInteraction.test.mjs：C07 pending prevents duplicate writes and no clipboard reads | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| JSONC-08 | jsonFormatterInteraction.test.mjs：C08 unmount ignores late callbacks and remount empty; source text tool unchanged by integration | components/jsonFormatter.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-01 | urlEncoderInteraction.test.mjs：C01 default mode, empty state and switching invalidation | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-02 | urlEncoderInteraction.test.mjs：C02 edit, decode failure, excess retention and recovery | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-03 | urlEncoderInteraction.test.mjs：C03 repeated actions use original input and switching action clears old output | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-04 | urlEncoderInteraction.test.mjs：C04 composition invalidates and requires manual operation | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-05 | urlEncoderInteraction.test.mjs：C05 sample guard, clear and focus reset | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-06 | urlEncoderInteraction.test.mjs：C06 actual result passed to clipboard, failure variants select output | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-07 | urlEncoderInteraction.test.mjs：C07 duplicate pending copies blocked | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-08 | urlEncoderInteraction.test.mjs：C08 stale completion never changes new result or selection | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| URLC-09 | urlEncoderInteraction.test.mjs：C09 unmount, remount, HTML plain value and integration | components/urlEncoder.test.ts | 重写DOM宿主，保留全部预期 |
| ROUTE-01 | routingSeo.test.ts：U01 eight unique static pages and a non-indexable 404 | unit/routingSeo.test.ts | 迁移 |
| ROUTE-02 | routingSeo.test.ts：route / resolves to home | unit/routingSeo.test.ts | 迁移 |
| ROUTE-03 | routingSeo.test.ts：route /office/ resolves to office | unit/routingSeo.test.ts | 迁移 |
| ROUTE-04 | routingSeo.test.ts：route /office/text-statistics/ resolves to text-statistics | unit/routingSeo.test.ts | 迁移 |
| ROUTE-05 | routingSeo.test.ts：route /developer/ resolves to developer | unit/routingSeo.test.ts | 迁移 |
| ROUTE-06 | routingSeo.test.ts：route /developer/json-formatter/ resolves to json-formatter | unit/routingSeo.test.ts | 迁移 |
| ROUTE-07 | routingSeo.test.ts：route /developer/url-encoder/ resolves to url-encoder | unit/routingSeo.test.ts | 迁移 |
| ROUTE-08 | routingSeo.test.ts：route /about/ resolves to about | unit/routingSeo.test.ts | 迁移 |
| ROUTE-09 | routingSeo.test.ts：route /privacy/ resolves to privacy | unit/routingSeo.test.ts | 迁移 |
| ROUTE-10 | routingSeo.test.ts：U02/03 known paths normalize preserving query/hash, unknown and wrong case stay 404 | unit/routingSeo.test.ts | 迁移 |
| ROUTE-11 | routingSeo.test.ts：U04 page model switches and not-found never inherits previous tool | unit/routingSeo.test.ts | 迁移 |
| ROUTE-12 | routingSeo.test.ts：U05 local/preview do not infer canonical from origin | unit/routingSeo.test.ts | 迁移 |
| ROUTE-13 | routingSeo.test.ts：U06 production rejects missing or invalid approved HTTPS origin | unit/routingSeo.test.ts | 迁移 |
| ROUTE-14 | routingSeo.test.ts：U07 approved test-only origin emits canonical paths and no 404 canonical | unit/routingSeo.test.ts | 迁移 |
| ROUTE-15 | routingSeo.test.ts：U08 DOM adapter deduplicates managed tags and removes stale canonical | components/seoDom.test.ts | 重写假DOM，保留预期 |
| ROUTE-16 | routingSeo.test.ts：U09 API/resources are not known page or canonical targets | unit/routingSeo.test.ts | 迁移 |
| ROUTE-17 | routingSeo.test.ts：memory history normalization replace does not introduce an extra entry | unit/routingSeo.test.ts | 迁移 |
| SSG-01 | ssg.test.mjs：SSG path validation rejects duplicates, traversal and missing pages | ssg/validators.test.ts | 迁移 |
| SSG-02 | ssg.test.mjs：SSG validation rejects missing body and missing assets | ssg/validators.test.ts | 迁移 |
| SSG-03 | ssg.test.mjs：SSG output covers eight pages and real 404 with no preview SEO residue | ssg/output.test.ts | 迁移（构建后保留产物检查） |

映射核对：TXT54、JSON25、URL30、TXTC8、JSONC8、URLC9、ROUTE17、SSG3，共154。TXT-20～44保留25个空白码点每项的单字符与夹心双断言；JSON/URL各内部循环不压缩。JSONC-06与URLC-08各保留4类变更×resolve/reject的8分支；JSONC-08、URLC-09附带页面包装/首页集成及禁止v-html源码断言保留，必要时新增DOM集成断言而非直接删掉。直接重复调用handler的防重复/禁用保护，改DOM后仍须保留底层调用次数与状态断言，不能因disabled挡事件而漏掉竞态。

## M1-06C2 执行范围（2026-10-11）

本轮已获负责人明确实施授权，覆盖三包精确安装、154项迁移（默认151、构建后SSG3）、Vitest/Test Utils/jsdom隔离、本地命令、测试类型检查和迁移证据。保留旧文件及既有未提交修改。G01仅对上述子集解除阻塞，I01～I04/V01～V04只完成获批子项；Playwright、三引擎、CI及生成器故障注入等保持未执行。详见[批准记录](../../architecture/decisions.md)。重复test命令按同一脚本执行，另提供设计中的test:unit、test:components、test:ssg、test:legacy、test:inventory及test:watch，不创建同名键或未实施E2E/CI脚本。

## M1-06C4 授权实施设计（2026-10-11）

负责人确认C3 Dev Done，本节优先于历史草案。ubuntu-24.04、.node-version精确24.21.0、官方Actions完整SHA、contents:read、checkout不保留凭据。push/PR运行Chromium，每天UTC19:17（北京时间次日03:17）和手动运行三引擎。PR/同分支push取消过期运行，定时/手动以run_id隔离，不相互取消。仅缓存npm下载包，不缓存node_modules或浏览器。

quality顺序执行跟踪锁文件/Node检查、npm ci、type-check、inventory、Vitest151、audit、完整build一次和SSG3。封装dist-ssg与E08需要的SSR manifest；摘要绑定commit、源码/测试/配置/锁文件及产物。browser矩阵依赖quality成功，下载同一artifact并校验后使用test:ci:e2e，禁止重建或复用未知旧产物。官方锁定Playwright CLI install --with-deps安装对应引擎，每引擎worker1。原npm test/test:e2e仍先完整构建，154身份不变。

普通摘要14天；完整HTML/截图/Trace统一7天（HTML包含Trace副本，避免期限穿透）；构建中转产物1天。只上传allowlist，上传前扫描凭据模式/合成敏感标记及zip内文本，检测失败删除待上传目录并阻断上传；不宣称通用DLP或截图OCR。报告缺失明确提示，已运行浏览器却无报告须失败。always归档不能掩盖核心失败；不使用continue-on-error。step summary记录真实步骤结果；远端Ubuntu/上传/失败阻断与分支保护保持待验证。

C4实际实施：quality中合并质量与一次完整SSG构建，独立job output绑定receipt SHA，browser矩阵复用同一工件，最终稳定Quality gate检查全部上游状态。普通摘要14天、完整诊断7天、构建包1天。已本地验证，无GitHub远端执行；详见[C4报告](../../verification/M1-06C4-github-actions.md)。

## M1-06C5A 公开提交准备（2026-10-11）

负责人确认C4本地Dev Done，批准以既有公开companyit/ToxBox作为候选CI目标；仅整理忽略、提交清单和明确本机标识，不授权暂存/commit/push/PR/部署。保留生产源码、配置、全部测试、154映射、006/007/ADR和必要验收证据；design.md与m106c4/actions.json必须可提交。临时Playwright runs及本地产物忽略，既有已跟踪截图/原始浏览器证据单列人工审阅，不自动移出索引。路径脱敏保留原字节于忽略的本地备份，原始/公开SHA另记；不修改算法、断言或历史测试结果。详见[C5A整理报告](../../verification/M1-06C5A-public-submission.md)。
