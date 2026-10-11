> M1-06C1承接（2026-10-11）：负责人已确认M1-06B Dev Done，Release Ready未完成。未实施的SSG-11/13与SSG-12 Playwright部分由[007测试与CI规格](../007-testing-ci/spec.md)、[设计](../007-testing-ci/design.md)、[任务](../007-testing-ci/tasks.md)细化，基线更新为154项（原151+3SSG）；ADR-019仍待审批，未授权迁移/安装/CI。下方M1-06A/B状态和证据保留为历史，不自动关闭任务。

> M1-06B授权更新（2026-10-10）：负责人批准原生SSG及必要Hydration/SEO适配；以下待批描述保留为M1-06A历史。仅实施SSG，保留原Node/CDP测试；不实施ADR-019的框架迁移或CI。正式域名与托管发布仍待批准。实际状态以文末实施记录为准。

当前实际设计：app.ts每次创建应用和路由，interactionReady.ts仅共享不可变注入键；entry-server.ts使用memory history返回body/head/modules，main.ts按SSG标记createSSRApp并等待路由。ToolPageLayout以fieldset保护首次交互，App.onMounted启用，导航DOM钩子只在客户端挂载后注册。数字固定zh-CN展示，404高亮依据已知route.name。

scripts/ssg.mjs通过Vite双构建，使用SSR manifest补CSS，复用客户端模板与Vue正文；清理旧目录、路径/资源/结构/head校验、超时和完整候选移动保证失败非零。公开目录dist-ssg，中间目录.ssg-build；build执行类型+SSG，build-only执行SSG，build:csr仅显式开发回退。当前仅preview，其他SEO模式拒绝，正式产物待批准。本地preview静态HTML优先，未知404，已知无斜杠308；不代表Cloudflare行为。详见[验收归档](../../verification/M1-06-ssg-testing.md)。

# 006 静态预渲染与测试架构技术设计

日期：2026-10-10，待批准设计；只有文档和只读研究，没有运行SSR/SSG验证。关联[spec](spec.md)、[tasks](tasks.md)、[ADR草案](../../architecture/decisions.md)018～020。

## 实际基线和已识别约束

已读取AGENTS、路线图、架构/门禁、005全部规范与验收、package、实际入口/Router/布局/head/三个工具及测试。当前Vue3.5.43、Router4.6.4、Vite8.3.4来自已安装元数据/前序证据，package声明范围另见package.json；Node前序记录24.21.0。本轮未重新执行构建、测试或安装。无.github目录、Vitest、Playwright、Vue Test Utils或jsdom直接依赖。现有151项Node测试：109纯函数、25交互、17路由/head；前序151通过、Chrome33通过是005历史证据，不是SSG通过。

AGENTS“Router未安装/本轮9文档”是早期基线；现有package和M1-05B授权/实施已经更新，本轮最新用户授权仅规范设计。005旧“Router未安装/首页试用”段标为实施前历史，不作为当前架构；无关键产品冲突。Git已有大量未提交实现/规范和证据，本轮不回滚、整理或混入业务修改。

| 当前文件/行为 | SSR风险 | 规划处理 |
| --- | --- | --- |
| main.ts createApp+mount | 直接挂载会替换预渲染DOM | 分离共享应用工厂与客户端入口，按明确产物标记Hydration或开发CSR |
| router/index.ts顶层createWebHistory | import时即依赖浏览器，构建端不能直接复用 | 改createSiteRouter(history)工厂，不导出跨页共享单例；DOM滚动只给客户端实例 |
| useRouteAccessibility导入router/index，afterEach触及document | 即使工具本身安全，App的传递导入仍会进入浏览器模块；在router ready后注册会漏初始head | 解耦hash/DOM适配，构建端不注册浏览器钩子；客户端显式应用当前页head，再监听后续导航 |
| seo.ts纯head与applyPageHead同文件 | 函数声明本身不读DOM，但边界不直观 | 纯PageHead可共用，DOM适配仅客户端；无需新增head库 |
| 三工具window/navigator在复制事件中，focus/select在事件处理 | 目前未发现模块级访问或setup触发复制；不能据此宣称SSR通过 | 构建端不触发事件，不mockwindow掩盖问题；逐页实际SSR和Hydration后复制回归 |
| 三工具模板默认toLocaleString() | Node/浏览器默认locale不同可能改变100000显示，空表单也显示上限 | 仅固定展示locale（建议zh-CN），不改码点/数字/URL计算语义；测试多浏览器语言 |
| Header依据route.path.startsWith分类高亮 | 固定404在/office/missing等前缀下与构建假路径高亮不同 | 分类当前状态改由已知route.name或静态分类元数据判断；catch-all统一无分类当前状态 |
| main.css与工具scoped CSS按路由分块 | 只复制入口HTML会漏首屏工具CSS | 客户端SSR manifest+render ctx.modules补齐页面CSS，查资源存在/顺序/重复 |
| vite.config.ts默认加载DevTools插件 | 构建端插件兼容尚未验证 | SSR配置只复用必要Vue/alias，DevTools限制到开发客户端；保持现有Vite版本，不靠升级规避 |

纯函数、原工具类型与交互语义不迁移到构建服务。文本说明中“收起工具”是遗留文案，未来仅在授权文件范围修正为离页，不构成新功能。

## 三方案比较与建议

这是源码和官方机制的定性判断，没有本项目SSG耗时/包大小/SEO数据。

| 维度 | A：原生Vue SSR + Vite + 自定义SSG | B：Router兼容第三方方案（候选vite-ssg） | C：维持CSR并延期 |
| --- | --- | --- | --- |
| SEO | 构建时产出每页正文/head；不保证收录 | 可生成页面内容/head；仍需产物验证 | 原始HTML无工具正文，依赖爬虫渲染 |
| 维护成本 | 自管有限生成器、head、资源/404和校验；责任清晰但需维护 | 减少生成器代码，需跟踪插件及传递依赖、head集成 | 当前最低，但SEO/托管缺口持续 |
| 依赖数量 | 推荐利用vue/server-renderer官方子路径，不新增SSG直接包；测试包另计 | 增加vite-ssg及传递head/HTML处理依赖，可能涉及Unhead整合 | 不增加SSG依赖；测试架构仍可独立引入 |
| 兼容性 | 复用现有Vue/Router4/Vite，应用工厂必须改造 | 上游main的peer范围包含Vue3、Router4、Vite8；只是声明证据，不能证明本项目可用 | 复用现状，不能满足静态内容目标 |
| 构建复杂度 | 客户端+构建端双构建、逐页输出、资源清单与原子完成 | CLI封装双端构建，但需要入口/插件/选项适配 | 单客户端构建，最低 |
| Hydration风险 | 明确控制双端状态、404、locale与DOM边界 | 仍须SSR安全与状态一致，插件不会消除风险；ClientOnly不能覆盖整个正文 | 当前没有Hydration，后续迁移风险未解决 |
| 扩展成本 | 页面目录驱动，当前8页可控；规模增长记录耗时再评估 | 路由增多时框架辅助可能减维护，版本升级/定制仍有成本 | 页面越多后续迁移与SEO补齐成本越大 |

推荐A，理由是项目已有静态目录、原生head纯函数及小规模页面，能够控制改动并避免再引入head体系。Vue官方文档使用vue/server-renderer，当前vue/package.json公开该导出、锁文件含同版本@vue/server-renderer3.5.43；这是只读依赖核对，不是SSG跑通。若A在授权验证中失败，暂停相关实现，不自动换B或迁框架。

B候选上游main/package.json读取到28.3.0，peer包含Vite8/Router4；README与package的最低Node描述有差异，应以最终选定发布包的元数据/锁文件与实际兼容性测试为准，不能直接安装main或“latest”。其依赖包含head管理及HTML处理，需重新审查现有无head库边界；本轮只比较，不批准B。C可保留开发回滚能力，不能当作本阶段SSG目标完成，延期发布必须记录风险并经负责人同意。

## 应用工厂、客户端与构建端

规划文件（尚未创建/改动）：

| 文件 | 建议职责/调整 |
| --- | --- |
| src/app.ts（新增） | 每次创建全新app/router、注入统一SEO环境与interactionReady=false；无DOM/Node文件API |
| src/main.ts | 客户端加载CSS，读取非敏感构建标记，createWebHistory，等待router.isReady；SSG标记用createSSRApp，开发CSR用createApp |
| src/entry-server.ts（新增） | createSSRApp+createMemoryHistory，push规范路由、await ready、renderToString及ctx.modules，返回body/head；不启动监听 |
| src/router/index.ts、routes.ts | 工厂与静态路由定义分离；共用规范化guard，浏览器滚动不进入构建端 |
| App.vue、useRouteAccessibility.ts | 应用就绪后只在客户端安装DOM/焦点/通知/错误hooks；初始head显式同步，不抢焦点；卸载清理监听 |
| ToolPageLayout.vue | fieldset包工具slot，ready=false时原生disabled，挂载完成后启用；相关链接在fieldset之外 |
| 原三个工具View | 仅必要的固定数字展示locale与遗留文案，算法/限制/复制保护不改 |
| data/pages.ts、utils/seo.ts | 单一页面/SEO模型；生成端用纯head，客户端只执行DOM适配 |
| index.html、vite.config.ts、package scripts | 明确body/head/产物模式插槽，SSR manifest及双端输出配置，新增经批准的构建/测试命令 |
| scripts/ssg.mjs（新增） | 读本次构建的已编译SSR入口和manifest，校验目录、逐页生成、验证完整性后产出静态目录 |

工厂按参数选择createApp/createSSRApp，不能靠“#app有子元素”猜模式；产物内仅放固定SSG版本/SEO模式/批准origin等非敏感配置，无用户输入。SSR模块不导入client入口，不访问window/document/navigator/localStorage；不创建定时器/浏览器监听。Node fs/path只在scripts，服务端包不进入公开产物。

构建端每路由都创建新实例，避免router状态、title、message跨页串用。全站只保留局部工具状态，无Pinia、KeepAlive或用户数据序列化脚本。客户端初始路由在mount前已ready，App不再Hydration成“正在加载页面…”树；客户端head和focus挂载时序须重测，不能沿用005结果。

### Hydration前输入保护

推荐共享interactionReady=false作为SSR与客户端初始状态；ToolPageLayout以原生fieldset disabled包住表单，相关导航仍可用；客户端App onMounted后置true。初始disabled属性和提示两端相同，不用window分支在第一次render直接改变树。点击/中文IME不能在尚未就绪的表单创建会丢失的草稿。

无JS提示放在HTML模板#app之外的noscript区域，避免noscript在启JS浏览器的解析差异进入Vue Hydration树。无JS仍能读页面说明、导航和规则，不能计算/复制；JS加载失败表单保持不可操作，不冒充正常可用。初始化失败提示与重试机制须可感知；不静默createApp重挂载掩盖Hydration问题。此准备状态与固定locale是待批准的必要UI适配，新增测试必须覆盖，但不得更改工具算法。

## 生成阶段与输出隔离

建议构建流水线：类型/测试 → Vite客户端构建（SSR manifest）→ Vite SSR构建 → 生成 → 产物校验 → 可供本地E2E的静态目录。路径只是提案：.ssg-build/client、.ssg-build/server为中间物，dist-ssg为唯一公开候选；已有dist作为明确CSR开发回退输出，不能混淆平台上传目录。审批后统一脚本与忽略规则，本轮不创建配置。

生成器从已编译entry-server导出的静态目录获取pages，不依赖抓取链接发现页面，也不让Node直接解释.vue。与routes双向核对：已知静态路由恰好8个；catch-all单列，不导出未知地址或参数/查询路径。每页await push/isReady、检查路由名，再renderToString、序列化同一createPageHead。title/属性内容转义，HTML模板插槽只能替换一次；不可将任意输入拼入HTML、脚本或文件名。

文件映射按spec表。校验path以/开头并规范尾斜杠，不允许query/hash、点段、反斜杠、绝对URL、输出目录逃逸；检查routeName/path/输出目标唯一、重复大小写和可解码碰撞，拒绝缺少组件或未列出的可索引路由。支持页面扩展应从该目录取得预期数量，当前基线为8，不永久硬编码只准8页。

先复制本次客户端资源和编译模板到临时静态目录，再生成9文档；使用客户端.vite/ssr-manifest.json与SSR ctx.modules补齐每页CSS/modulepreload，去重且保持样式顺序。所有href/src按base解析检查目标，动态路由CSS必须在初始HTML可加载；不要仅等Hydration后动态import补CSS。建议base=/并使用绝对资源路径；相对./会在嵌套路由失效，改子目录要重审Router base/SEO/文件映射，不在本阶段自动支持。

输出禁止公开SSR构建、Node源码、源码映射中的输入样本/秘密及工作区文件；只复制构建白名单。每页上限建议30秒、全流程300秒、渲染并发1，均为待批准的故障防护参数而非性能承诺，后续按实测调整。重复构建用新的临时目录；所有页面和资源检查通过才替换候选输出，任何失败非零退出并标记无新可用候选。不得留下部分新HTML混入旧资源，CI不得上传旧目录冒充新构建成功。

## 404与Cloudflare行为

404.html也由同一App在构建时渲染catch-all，使用内部占位未知路径（不得进入目录/sitemap），head固定noindex/无canonical。客户端直接访问实际未知路径用memory对应的catch-all树Hydration；页面不显示占位或真实未知路径。Header必须按已知route.name而非path前缀决定当前分类，解决构建占位与/office/missing/、/developer/missing/导致的DOM差异；对此专设负向/正向测试。

Cloudflare Pages顶层404.html会关闭默认SPA回退；8个已知路径由目录index.html提供，未知直达由静态404响应。不得另加/*→/index.html 200覆盖此机制。无斜杠路径优先利用目录规范行为并核验，必要时仅为已知路径生成精确永久重定向，需平台验证无循环/缓存问题。客户端站内404仍不会改变已经收到的HTTP200文档；直接GET未知路径才验收真实404。

/404.html直达行为单列，不能把它的状态当所有未知路径的证据。缺失assets和/api/v1/必须非成功兜底，本阶段不创建API；404默认无需服务端函数。Vite preview会回退的结果不等于Cloudflare证据；Dev Done用禁SPA兜底的本地静态测试服务验证产物，发布前仍需获授权的Cloudflare等效/真实环境核验。本地测试服务仅供测试启动/结束，不是生产常驻服务；Wrangler若需要安装必须另批，不在候选依赖里默认带入。

## SEO环境与正式产物

构建与客户端注入同一不可变SeoEnvironment，移除useRouteAccessibility当前硬编码preview；默认preview原始HTML及客户端noindex、无canonical。正式构建只能接受已批准HTTPS origin，复用createPageHead的校验；不能从本机端口、pages.dev或访问Host推断正式地址。正式公开HTML不能先含noindex再靠JS移除。404永远noindex无canonical。

域名未知时不生成sitemap.xml/robots.txt（延续005边界）；已有文件或旧正式配置不得被复制进preview输出。正式域名/索引白名单和产物任务另获授权后，sitemap仅批准可索引规范路径，robots引用同域sitemap；不生成假lastmod，不收API、404、别名或query/hash。preview noindex不是保密措施，robots也不是访问控制。正式HTML内容可见不等于搜索已收录，搜索观测需单独日期与证据。

## 统一测试架构（待批准，未安装）

建议候选devDependencies为vitest、@vue/test-utils、jsdom、@playwright/test；精确版本在实施前按Node24/Vite8/Vue3/TS6的已发布元数据与实际安装解析核对并锁定，不直接取未评估最新版。不新增运行时测试包。jsdom只做组件DOM事件，浏览器权限/焦点/IME与布局由真实浏览器验证。

规划目录：tests/unit（算法/head/路由/生成器纯逻辑，Node环境）、tests/components（SFC标准挂载，jsdom）、tests/ssg（无浏览器SSR隔离/输出清单与失败场景）、tests/e2e（Playwright禁JS/启JS/路由/工具），fixtures只含合成样本；vitest.config.ts和playwright.config.ts尚不存在。

### 渐进迁移与防止测试丢失

现有text54、JSON25、URL30纯函数共109，组件8+8+9共25，routingSeo17，共151项。先冻结ID/输入/预期映射，逐文件把node:test入口迁Vitest，保留node:assert亦可；t.after改afterEach/onTestFinished，不能误套runner语义。路由测试用真实memory router，head从假宿主逐步改真实jsdom DOM验证。组件测试由Vue编译器+自定义renderer改为Test Utils mount真实SFC，维持复制故障/异步竞态/组合输入/卸载复位全部预期；await nextTick/flushPromises，不依赖睡眠。

迁移期间旧测试与新测试放隔离目录/明确include，Node与Vitest各自只扫描自己的文件；禁止全局搜.test后让两个runner互相执行。每迁一组双跑对照，review确认覆盖等价后才移除旧副本；运行两次的同一用例不能宣称覆盖翻倍。全局navigator/clipboard/计时mock恢复，依赖全局替身的测试串行或实例隔离。生产组件不为了测试暴露工具输入。

### HTML与Hydration自动检查

Node静态检查验证路由→文件清单、资源引用及重复/遗漏；完整HTML结构使用已获批jsdom或Playwright禁JS解析，不能仅靠正则搜索h1就通过。禁JS context逐页直达，断言原始HTTP HTML与浏览器解析DOM的唯一head/main/h1、介绍、工具空状态及disabled、导航href，无模板占位符/用户文本。

启JS context先于goto安装console/pageerror监听，收集Vue hydration mismatch、recoverable hydration error、未捕获异常与失败资源请求；开发诊断构建（保留Vue警告）和最终生产SSG产物都测。Vue可能恢复不匹配后仍可用，故“能点击”不是充分条件：负向夹具故意改变SSR文字/属性，必须被诊断用例拦截，不向生产代码注入故障；必要时审批启用生产Hydration诊断标志，禁止靠隐藏警告通过。生产同时校验DOM数量、保留的原始节点身份、无替换/重复挂载、各按钮只触发一次、无初始失焦。

阻断客户端脚本后确认可读HTML；延迟客户端包时确认输入disabled，Hydration后启用且初始仍空；切页返回清空、复制pending离页不写回。采用语言en-US/zh-CN等客户端context对同一HTML验证固定locale，测试404不同路径前缀，重复/不同顺序生成不串状态。Clipboard模拟、权限和外部应用分开记录。

### 引擎、设备与真实产品

Playwright projects建议chromium、firefox、webkit，另加已安装Chrome channel=chrome；Edge通道可在发布验证另行启用。自带Chromium不是品牌Chrome；Firefox/WebKit有自动化补丁，不能视为发行版Firefox/Safari的所有行为。macOS WebKit更接近Safari平台，但仍不是真实Safari。CI Linux三引擎用于早期发现问题，发布按ADR-011补真实Chrome/Edge/Firefox/Safari两个主版本和真实手机；mobile device emulation只标模拟视口。浏览器二进制与系统依赖下载也是待批准安装范围，不能仅获npm授权就默认下载全部环境。

## GitHub Actions CI建议（只规划，不创建workflow）

- PR首层：只读仓库权限、明确Node24 patch/锁文件、npm ci、类型、旧/新单元及组件、SSR无浏览器隔离；失败阻止后续，缓存按OS/Node/lockfile区分。
- PR第二层：构建SSG一次，执行清单/HTML/资源/错误注入检查，将同一个不可变产物摘要传给E2E；不可每浏览器重新生成不同HTML。不能把CSR npm build当SSG成功。
- PR核心浏览器：Chromium和可用真实Chrome核心路由/三工具/Hydration检查；失败即阻塞DD。初次下载/浏览器不可用记录失败或阻塞，不写通过；没有CI凭据/关联仓库时仅做本地等价验证并标CI未执行。
- 夜间/手动扩展：Firefox/WebKit、macOS平台、模拟移动和全面E2E；结果不是可忽略的失败，核心Hydration/安全失败同样阻塞DD/发布；目标环境未测仍是发布缺口。
- 发布前手动工作流：获批准域名/SEO模式与托管检查、性能及人工签核；不包含deploy步骤，不使用发布token，不让pull_request_target执行不可信代码或输出秘密。第三方Actions版本实施时固定可信版本/commit，实际GitHub接入/提交仍须授权。

报告保留运行环境、产物SHA、测试映射、JUnit/HTML报告、失败截图/trace、资源/console日志；仅合成样本，失败trace也不得存真实用户内容。建议日志/截图保留14天、失败trace7天（待批准），真实UAT归档按项目文档保留；成功也记录哪些引擎未跑，重试不覆盖首轮失败。

## 性能与回滚

性能比较使用同机同Node/浏览器、相同8页清单和构建模式记录CSR/SSG耗时、资源体积、HTML首屏与LH。LH建议每代表页生产静态预览连续3次保存原报告/中位数及设备/网络/CPU节流设置，不将LH90初步目标改硬门槛。工具响应沿002/003/004批准预算/目标与样本、实机每组合10次，不以CI总时长/双RAF保证真实屏幕达标。CI只作趋势观察；硬预算或新增lighthouse包须另批。

回滚分两层：开发保留明确CSR构建脚本和上一已审查代码/锁文件/产物摘要；SSG失败不自动上传CSR，不以git reset/覆盖现有未提交修改回滚。发布后回滚只有在独立发布授权与上一可用产物留存时才设计执行，不在本轮实际发生；回退CSR将重新打开SEO/HTTP404缺口，须负责人批准，不宣称Release Ready仍自动成立。

## 待批准参数与依赖

D-006-01/ADR-018：选A，复用vue/server-renderer导出，应用/Router工厂与客户端/构建端隔离，输出目录及完整性策略；不直接声明新的SSG依赖。

D-006-02/ADR-019：按151项映射迁Vitest、Test Utils/jsdom及Playwright，明确兼容版本、浏览器/系统下载、是否在M1-06B同轮完成、CI仓库接入和证据留存。

D-006-03/ADR-020：9文档产物、404首屏Hydration与分类高亮修正、preview/正式SEO环境、平台验证阶段；域名/发布产物单独批准。

D-006-04：Hydration前fieldset禁用交互、固定zh-CN展示locale、30秒/页300秒整体/并发1及报告留存期限；均是提案，不是实测结论或硬性能承诺。

## 官方依据（2026-10-10查阅）

- [Vue SSR/SSG与Hydration](https://vuejs.org/guide/scaling-up/ssr.html)、[Vite SSR与SSR manifest](https://vite.dev/guide/ssr.html)：原生A机制与资源映射依据。
- [vite-ssg仓库](https://github.com/antfu-collective/vite-ssg)、[上游main包声明](https://raw.githubusercontent.com/antfu-collective/vite-ssg/main/package.json)：B候选，仅声明层兼容证据，不是发布包实测。
- [Vitest安装要求](https://vitest.dev/guide/)、[测试环境](https://vitest.dev/guide/environment.html)、[Vue Test Utils](https://test-utils.vuejs.org/guide/)：版本/环境须实施时核对。
- [Playwright浏览器与平台差异](https://playwright.dev/docs/browsers)、[CI](https://playwright.dev/docs/ci-intro)：自动化引擎不替代真实Safari/设备。
- [Cloudflare Pages路径与404](https://developers.cloudflare.com/pages/configuration/serving-pages/)：顶层404关闭默认SPA回退，HTTP行为仍须实测。
