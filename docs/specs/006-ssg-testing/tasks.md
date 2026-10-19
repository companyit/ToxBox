> DEV-01 文档事实核对：当前任务承接说明（拟议更新）
>
> 核对日期：2026-10-19；唯一开发仓库为 ToxBox仓库，基线 HEAD 为 `928491c9dd56f66494f47c7c8f914bb0c8deb5c4`。本说明只更新文档事实，不授权实现、依赖安装、Git 写操作、远端设置或部署。此前其他开发主线不作为当前进度与审批依据。
>
> 三个工具已实现独立试用页面；Router 4.6.4、Vitest 4.1.11、Playwright 1.64.0 已在声明、锁文件及本地安装中存在。SSG 实现 8个站点页面及404，本地 preview 支持已知路径尾斜杠重定向和未知路径 HTTP 404。客户端及静态页面使用 preview SEO（noindex、无 canonical），正式域名、sitemap/robots 与真实托管行为尚未完成验证。GitHub Actions 工作流及本地验证记录存在，远端运行和分支保护未在本轮核验。历史测试结果不等于当前 HEAD 重新执行通过。 本文件早期“ADR-019待审批／迁移未授权／未安装Playwright／CI未实施”仅描述当时范围。测试迁移与本地浏览器/工作流实施记录见007；不自动勾选本文件复选框，不关闭生成器故障注入、正式SEO和托管等完整验收缺口。
>
> 下文历史正文及证据保留；旧阶段措辞不作为当前实现或授权的唯一依据。

> M1-06C1承接（2026-10-11）：负责人已确认M1-06B Dev Done，Release Ready未完成。未实施的SSG-11/13与SSG-12 Playwright部分由[007测试与CI规格](../007-testing-ci/spec.md)、[设计](../007-testing-ci/design.md)、[任务](../007-testing-ci/tasks.md)细化，基线更新为154项（原151+3SSG）；ADR-019仍待审批，未授权迁移/安装/CI。下方M1-06A/B状态和证据保留为历史，不自动关闭任务。

> M1-06B授权更新（2026-10-10）：负责人批准原生SSG及必要Hydration/SEO适配；以下待批描述保留为M1-06A历史。仅实施SSG，保留原Node/CDP测试；不实施ADR-019的框架迁移或CI。正式域名与托管发布仍待批准。实际状态以文末实施记录为准。

# 006 静态预渲染与测试架构任务清单

日期：2026-10-10。M1-06A规范设计已起草，待审批；M1-06B未授权，Dev Done未开始，Release Ready未完成。本轮不执行下面的实现或功能验证。

依据：[spec](spec.md)、[design](design.md)、[门禁](../../quality/gates.md)。负责人确认005 Dev Done仅作为前序状态，不把其151项测试/33项Chrome证据追认为SSG、Hydration或新测试框架通过。

## 设计与审批门槛

- [x] S01：只读检查项目约束、路线图/架构/门禁、005三份规范/验收、package/锁文件、源码/测试、Git；确认Router4已安装、无Vitest/Playwright或.github，发现SSR导入单例、locale和404分类高亮风险。
- [x] S02：起草006三份规范及ADR-018～020草案，比较A/B/C，研究官方文档/上游声明；没有安装、生成或浏览器执行。
- [x] S03：本轮文件摘要对比确认仅8份Markdown文档变化，src/tests/package/锁文件未改；相对链接有效，14项需求均有验收与I/V映射，ADR-018～020保持待批准；git diff --check通过。没有执行构建、测试、浏览器或SSG，不能据此勾选实施验证。
- [ ] G01：负责人批准ADR-018原生Vue SSR+自定义SSG及应用工厂；确认不用第三方SSG包，不把现有渲染器依赖当作实现授权。
- [ ] G02：批准ADR-019测试包、具体兼容版本核对策略、浏览器/系统依赖下载，以及本轮测试迁移/CI实施范围。默认建议SSG和核心测试同轮，CI接入是否需要真实GitHub运行须明确；未批准部分不能安装或启动远端执行。
- [ ] G03：批准ADR-020、D-006-04的404/SEO环境、Hydration前禁用交互、固定展示locale、输出目录、构建超时/并发和证据留存提案；明确M1-06B编码授权。
- [ ] G04（发布）：批准正式HTTPS origin、索引白名单、sitemap/robots与Cloudflare配置/验证；真实生产部署仍单独授权。

## 实施任务（全部待执行）

| 编号 | 依赖 | 范围与完成条件 |
| --- | --- | --- |
| I01 | G01、G03 | 建立app/router工厂与entry-server，去掉构建路径上的createWebHistory单例和DOM传递导入；无浏览器全局渲染成功 |
| I02 | I01 | 客户端createSSRApp/开发createApp边界、router ready时序、初始head、浏览器hooks及清理；三个工具Hydration一次 |
| I03 | I01、I02、G03 | ToolPageLayout初始交互保护、固定locale、404分类高亮按已知路由；不改变算法/复制/状态语义 |
| I04 | I01、G03 | 客户端/SSR构建配置、生成器、8页+404映射、manifest CSS及资源解析、临时目录/失败退出/超时完整性检查 |
| I05 | I04、G03 | 共享PageHead序列化、preview/正式模式、404静态树与客户端一致；未批域名无canonical/SEO文件，正式配置错误拒绝 |
| I06 | G02 | Vitest Node/jsdom项目、Test Utils标准组件挂载、151旧测试逐项迁移映射与双跑隔离；迁移审阅前不删旧覆盖 |
| I07 | G02、I02～05 | Playwright禁JS/启JS用例、诊断构建、Hydration负向夹具、引擎项目与本地静态测试服务；测试产物不进公开目录 |
| I08 | G02、I04、I06、I07 | 获批后接入CI分层和同产物测试/报告；未获得远端接入授权仅本地验证且CI仍标未执行 |
| I09 | I04、I07 | 同设备CSR/SSG观察方案、扩展流程、显式CSR开发回退与失败阻断，不自动上传降级产物 |
| I10 | G04、I05 | 正式origin/canonical/sitemap/robots、平台路径/404/资源/API边界配置；不包含生产部署授权 |

顺序：G01～03 → I01（无浏览器SSR隔离）→ I02/03 → I04/05 → I06逐组对照 → I07最终静态产物 → I08获批CI → I09证据与审阅。I10发布任务受G04控制。若只批准SSG未批准测试依赖，先维持旧Node/CDP验证并调整获批任务与门禁记录，不能默认装框架；需新增审阅记录，而不是默默跳过测试。

## 需求—实施—验证追溯

| 需求 | 实施任务 | 验证任务与固定用例 |
| --- | --- | --- |
| SSG-01 | I01、I04 | V02 Q01～03、V04 E01 |
| SSG-02 | I01、I04 | V01 Q04、Q05、V02 Q09 |
| SSG-03 | I02、I03、I07 | V04 E02～04、E08、E10 |
| SSG-04 | I02、I03 | V03 Q10～12、V04 E03、E05～06 |
| SSG-05 | I05 | V02 Q03、Q06、V04 E01～02 |
| SSG-06 | I04 | V02 Q01、Q07、V04 E01、E07、V06 H01 |
| SSG-07 | I03、I05 | V02 Q08、V04 E09、V06 H02 |
| SSG-08 | I04、I10 | V06 H01～03（平台部分不得用本地通过代替） |
| SSG-09 | I05、I10 | V02 Q06、V05 Q13～15、V06 H03 |
| SSG-10 | I04 | V01 Q16～19、V02 Q01/Q07/Q09 |
| SSG-11 | I06 | V03迁移151项映射/双跑、Q10～12 |
| SSG-12 | I07 | V04 E01～10、引擎矩阵和诊断负向夹具 |
| SSG-13 | I08 | V07 CI01～03及证据摘要 |
| SSG-14 | I09 | V08 M01～03、V01 Q20、V09门禁审阅 |

## 固定验证计划（全部未执行）

Q为单元/SSR/产物与组件验证；具体runner依获批迁移阶段使用Node或Vitest。HTML结构用已批准解析环境检查，正则只可辅助定位，不替代DOM/HTTP。测试域名都是夹具，不能输出生产文件。

| ID | 输入/操作 | 明确预期 |
| --- | --- | --- |
| Q01 | 8规范页面目录+catch-all | 生成spec表中8个index.html与404.html，清单双向相等；没有unknown/API/hash/query输出 |
| Q02 | 关闭JS读取8页 | 每页可读介绍、导航、规则和空表单，有noscript说明；工具不能计算且输入/处理未就绪disabled |
| Q03 | 读取每页原始HTML并解析 | 独立title/description唯一，lang=zh-CN，main/h1各1；工具名称/规则正文存在；不要求首页hero文字逐字等于meta title |
| Q04 | 无window/document/navigator的Node进程导入SSR入口并逐页渲染 | 不报浏览器全局错误、不创建监听/浏览器API调用，不引入client-only模块 |
| Q05 | JSON→文本→URL→JSON两个生成顺序，各新app/router | HTML/head相同且初始空，文本五项0、JSON缩进2、URL component；无上页提示/状态泄漏 |
| Q06 | preview无origin；production缺origin/HTTP/凭据/路径/query/hash；有效批准测试origin | preview noindex无canonical；非法正式配置非零退出；有效夹具canonical恰为origin+规范path，404无canonical |
| Q07 | 检查首页与嵌套工具资源、动态scoped CSS、重复引用 | 引用解析到本次client构建文件，base=/，无相对目录错位、缺CSS或重复head；渲染模块CSS首屏可加载 |
| Q08 | 404静态HTML与未知/office/missing/、/developer/missing/对应初始化 | 不反射路径，无分类当前状态、noindex无canonical，catch-all树匹配；直接/404.html行为另列 |
| Q09 | 检查公开目录内容 | 不含SSR入口/Node服务/npm包/中间目录、旧CSR页面或真实用户输入；只有获批静态产物和报告之外的白名单 |
| Q10 | 151项旧→新清单，逐组双跑 | 原ID/输入/预期保留，Node与Vitest环境隔离，109算法+25交互+17路由/head均有归属；新增用例单列 |
| Q11 | Test Utils挂载三个工具，compositionstart/input/end、超限/恢复、复制resolve/reject/挂起 | 保持原统计/手动处理语义与上限，旧结果失效，复制回退选择/焦点意图及revision保护保留；不宣称系统IME通过 |
| Q12 | pending复制→卸载→重挂载，恢复全局mock；ready=false→true | 无旧提示/选择污染，新组件空；未就绪disabled，就绪后可用；测试间无navigator/Promise泄漏 |
| Q13 | preview构建含旧正式sitemap/robots候选残留 | 新preview输出无canonical/sitemap/robots，不能把旧正式文件带入；原始/客户端robots一致 |
| Q14 | 正式批准测试origin+索引白名单排除privacy的夹具 | sitemap恰含白名单规范loc；非索引页无canonical，404/API/query/hash/别名排除，robots sitemap同origin |
| Q15 | 无内容更新时间；后续有明确真实更新时间 | 前者不生成lastmod；后者只使用批准的内容时间，不以每次构建时间冒充 |
| Q16 | 重复routeName/path、输出路径碰撞、非法点段/反斜杠/编码碰撞 | 生成前非零拒绝，不写越界或互相覆盖文件 |
| Q17 | 页面目录缺项/route缺组件/新增已知路由未列目录/缺h1或description | 双向校验失败，不静默遗漏或仅输出首页 |
| Q18 | 第5页render抛错、超时或manifest资源缺失 | 构建非零、候选标失败，无部分新产物可发布；旧产物不得被当本次成功上传 |
| Q19 | 连续生成两次，第二次移除一个获批测试页面 | 新目录不残留旧页；9文档基线和扩展后的数量由目录计算，不靠旧dist内容推断 |
| Q20 | 新增测试页面定义/组件/用例，随后故意SSG失败选择CSR开发回退 | 成功时自动纳入生成/检查；失败不自动发布CSR，不覆盖当前未提交改动或更改发布门禁 |

Q14涉及未来正式产物实现，只在G04后执行；其他正式origin纯模型/失败夹具可在本地独立测试，不代表正式域名获批。

## 真实浏览器计划（Playwright获批后）

| ID | 操作与环境 | 预期与证据 |
| --- | --- | --- |
| E01 | 8页在禁JS context直达，原始响应+浏览器DOM；嵌套页刷新 | 内容/head/资源正确，静态导航可用，表单disabled且有需要JS说明；保存HTML/状态/截图 |
| E02 | 启JS前装console/pageerror监听，8页逐一直达 | 无Hydration mismatch/异常/重复main/h1，标题描述前后一致，节点身份未被整页替换，初次不抢焦点 |
| E03 | 人为延迟client JS，检查表单后放行 | 延迟期间不能输入/操作，不产生会丢失草稿；Hydration后启用，三个工具初始仍空且操作一次只响应一次 |
| E04 | 同样本分别在CSR和SSG运行文本/JSON/URL，覆盖既有核心、错误、超限、复制回退 | 结果及规则一致；包含中文Emoji、JSON六顶层/数值拒绝、URL四操作/非法UTF8；复制故障注入与真实权限分开 |
| E05 | 三工具输入后切页、前进后退、刷新、复制pending离页 | 按原契约清空/卸载，不迟到写提示；导航焦点/保存滚动/hash行为不退化 |
| E06 | 客户端en-US、zh-CN等locale对同一构建HTML | 上限/统计初始展示一致，无locale引发警告；计算语义不变 |
| E07 | 375/768/1440桌面、手机模拟、深浅色及工具长输出 | 无页面横溢/样式闪失或明显遮挡；留截图，均非真实手机验收 |
| E08 | 保留Vue诊断的独立SSG测试产物，故意改变SSR节点文字/属性 | 监测器确实报失败；恢复正常产物后通过，不能只关闭警告或用全量CSR替换蒙混 |
| E09 | 未知/office/missing/、/developer/missing/、/404.html | 404静态与Hydration一致，不反射路径，无分类高亮差异，noindex无canonical；分别记HTTP，不能站内UI冒充HTTP404 |
| E10 | 最终生产SSG：入口/路由chunk失败、快速导航、延迟加载失败及重试 | 中文可感知失败状态；不静默重挂载，旧失败不覆盖新页，恢复后可操作；SSR输出不因错误含用户文本 |

项目矩阵：chromium、firefox、webkit及真实Chrome通道分别记录；PR先核心Chromium/Chrome，扩展三引擎运行留独立结果。WebKit不是Safari；mobile emulation不是手机；单个工具点击成功不等于全部Hydration用例通过。实际Safari/Firefox发行版、系统输入法、外部复制、读屏留人工Release Ready。

## 托管、CI和性能验证

| ID | 操作 | 预期 |
| --- | --- | --- |
| H01 | 获授权Cloudflare等效/真实环境GET8页及无斜杠入口 | 规范页HTTP200及正确Content-Type，无斜杠规范化无循环，CSS/JS真实可读 |
| H02 | GET未知不同前缀、缺assets/API，另GET/404.html | 未知真实404，不是index200；缺文件/API不被SPA回退吞；独立记录body、headers、客户端404差异 |
| H03 | preview与批准正式产物的HTML/robots/sitemap/canonical、缓存配置 | 与目录和SEO模式一致，无假域名/旧残留；Vite预览不能替代平台记录 |
| CI01 | 在获批仓库PR执行类型→单元/组件→SSG→浏览器，故意让首层失败 | 后续门禁阻断，同一产物摘要贯穿，测试失败无发布动作，Node/lock记录可复核 |
| CI02 | 浏览器不可用/下载失败、无GitHub接入权限、测试重试 | 标失败/阻塞/未执行并保留首轮记录，不能虚报通过；不自动下载未授权工具 |
| CI03 | 检查报告/trace/日志留存和权限 | 仅合成样本、只读repo权限、无部署token/秘密泄漏；按批准期限保留 |
| M01 | 同机同版本对CSR与SSG8页构建及产物观察 | 保存真实时长/大小/路由数，不用估算替代数据，SSG阶段耗时分别列 |
| M02 | 代表页生产静态预览，记录设备/节流并LH连续3次 | 保存报告/中位数及未达目标分析；90仅初步目标，工具预算另测 |
| M03 | 真实Mac/手机按002/003/004样本与次数测工具响应 | 逐次纯函数及可用绘制时机记录，遵守各规格批准预算/目标；CI或headless不替代设备实测 |

V01生成器纯逻辑/SSR隔离，V02产物HTML/资源，V03旧测试迁移与组件，V04真实浏览器，V05正式SEO夹具/产物，V06托管，V07 CI，V08性能，V09门禁/风险/回滚审阅。每次记录需求/用例ID、命令/退出码、日期、实际环境/浏览器版本、锁文件/产物SHA、步骤/实际结果与证据路径；未执行不能勾选。未来验收文件建议docs/verification/M1-06-ssg-testing.md，本轮不生成空通过记录。

## 结束门禁

- [ ] V09 / Dev Done：获批实现包对应I/V任务完成，原151覆盖保留、新SSG/HTML/Hydration测试通过，类型/完整SSG构建及真实浏览器核心通过，无阻塞缺陷，未测明确归档，经负责人确认。
- [ ] Release Ready：RR-01～07及H/M/真实设备与无障碍等发布条件完成；正式域名和发布检查有证据，部署仍另批。

失败登记DEF-006-编号、环境、复现、预期/实际、证据、严重度、修复与复验。漏页、错误Hydration/交互、输入丢失或泄漏是阻塞缺陷，不把它们列性能优化绕过。第三方版本兼容尚未验证是风险/待验证，不虚构实际失败。

M1-06A历史结论：当时G01～03未批准，不具备直接实施条件。当前状态如下。

## M1-06B实施状态（2026-10-10）

证据详见[验收归档](../../verification/M1-06-ssg-testing.md)。本轮授权只覆盖原生SSG，不迁移测试框架、不实施CI或部署。

- [x] G01：ADR-018正式批准；G03中的静态产物、404、preview SEO和必要Hydration适配获批。正式域名/发布与留存政策仍待批准。
- [x] I01：应用/路由工厂和entry-server，先about最小验证，再无浏览器全局逐页SSR。
- [x] I02：SSG createSSRApp/开发createApp，路由就绪后挂载，初始head同步、客户端DOM钩子隔离。
- [x] I03：fieldset准备保护、固定zh-CN展示、按已知路由高亮404；不改计算语义。
- [x] I04：双构建、manifest CSS、8页+404、路径/结构/head/资源及失败校验，完整候选移动到dist-ssg。
- [x] I05本轮：共享静态preview head、noindex、无canonical/sitemap/robots；未批正式模式明确拒绝。正式索引产物尚未实施。
- [ ] G02/I06：ADR-019仍草案，测试迁移未授权，原151项保留。
- [ ] I07原Playwright计划：未实施。本轮用已有Node/CDP真实Chrome完成核心验证，不冒充其他引擎覆盖。
- [ ] I08：CI未授权、未执行。
- [x] I09本轮机制：显式build:csr开发回退、SSG失败阻断、重复构建一致和风险登记；性能比较仍待验证。
- [ ] G04/I10：正式域名、Cloudflare和发布待批准/验证。
- [x] V01/V02本轮：全页SSR、静态产物/head/资源、重复构建；新增3项SSG测试。Q16～18部分覆盖，渲染超时及任意故障注入计划不能写成全部执行。
- [x] V03本轮回归：原151项+新增3项=154通过；没有执行Vitest迁移或双跑。
- [x] V04核心：23项禁JS/Hydration专项、3项实际阻断客户端脚本、33项工具/路由/布局回归，共59项真实Chrome通过。
- [ ] V04扩展：E06完整多locale、E10所有网络故障、其他引擎及真实设备待验证。
- [ ] V05正式SEO/Q14～15、V06托管、V07 CI、V08定量性能：未执行。
- [x] V09工程核查：type-check、build、154测试、git diff --check通过；已发现问题修复复验，无已知阻塞缺陷。Dev Done开发条件满足，提交负责人审阅确认。
- [ ] Release Ready：未完成，001～005发布遗留不自动关闭。

追溯补充：SSG-01～07/09～10本轮范围由I01～05→V01/02/04证据覆盖；SSG-08及正式SSG-09由I10→V05/06待发布批准；SSG-11/13由I06/08→迁移与CI验证，未授权；SSG-12改用获准的既有CDP完成核心E01～05/E07～09及E10子集，完整矩阵保留；SSG-14机制完成、性能V08待测。完整固定计划未执行项保持未完成，不以核心门禁通过勾选整套计划。
