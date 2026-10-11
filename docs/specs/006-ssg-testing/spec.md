> M1-06C1承接（2026-10-11）：负责人已确认M1-06B Dev Done，Release Ready未完成。未实施的SSG-11/13与SSG-12 Playwright部分由[007测试与CI规格](../007-testing-ci/spec.md)、[设计](../007-testing-ci/design.md)、[任务](../007-testing-ci/tasks.md)细化，基线更新为154项（原151+3SSG）；ADR-019仍待审批，未授权迁移/安装/CI。下方M1-06A/B状态和证据保留为历史，不自动关闭任务。

> M1-06B授权更新（2026-10-10）：负责人批准原生SSG及必要Hydration/SEO适配；以下待批描述保留为M1-06A历史。仅实施SSG，保留原Node/CDP测试；不实施ADR-019的框架迁移或CI。正式域名与托管发布仍待批准。实际状态以文末实施记录为准。

当前实施状态：8个正式页面与404已生成静态正文和head，真实Chrome完成禁JS、节点保留、准备状态及工具回归。SSG-11/13框架迁移与CI不属于本轮；SSG-12核心采用已有Node/CDP，不安装Playwright。当前只批准preview产物；非preview SEO构建明确拒绝，正式索引产物尚未实施。Dev Done开发条件满足、提交负责人审阅；Release Ready未完成。实际证据与未测范围见[本轮验收](../../verification/M1-06-ssg-testing.md)。

# 006 静态预渲染与测试架构需求规格

日期：2026-10-10。阶段：M1-06A / Specify + Plan，待人工审批。只授权规范与只读可行性研究；没有实施SSG、迁移测试、安装依赖或修改业务/配置。负责人已确认M1-05B Dev Done；Release Ready及001～005原未测事项继续保留。

依据：[路线图](../../product/roadmap.md)、[前端架构](../../architecture/frontend.md)、[架构决策](../../architecture/decisions.md) ADR-014、016、017及草案018～020、[质量门禁](../../quality/gates.md)、[005规格](../005-routing-seo/spec.md)、[005验收证据](../../verification/M1-05-routing-seo.md)。

## 目标与排除范围

为既有Vue3 + Vite + Router4设计构建时SSG：生成实际页面HTML，再在浏览器Hydration恢复交互，部署物只有静态HTML/CSS/JS，不需要常驻Node/Python。统一规划Vitest、组件交互、Playwright、静态产物及CI验证，不修改三个工具统计/数值安全/编码规则和输入限制。

不增加工具、Pinia、后端、用户内容序列化、上传、持久化、广告、分析；不实施线上SSR、不迁移框架、不以预渲染保证搜索收录。M1-06B建议先落实原生SSG及核心测试；依赖和CI接入必须按审批范围执行，不能由本规格自动取得权限。

## 需求、可执行验收条件与阶段

| 编号 | 需求 | 验收条件 | 门禁归属 |
| --- | --- | --- | --- |
| SSG-01 | 静态内容覆盖 | 按现有pages白名单生成8个规范页面及404.html；禁JS时各已知页可读h1、介绍、导航、工具规则与初始表单，而非只有#app；无需运行时渲染服务 | Dev Done本地产物；托管属Release Ready |
| SSG-02 | 双端隔离 | 构建端逐页创建独立app/router并使用memory history；模块导入/渲染在无window/document/navigator环境不报错，不注册DOM副作用；最终静态目录不含服务端入口或Node依赖包 | Dev Done |
| SSG-03 | Hydration与交互 | 已知预渲染页由createSSRApp在同路由就绪后Hydration一次；开发CSR仍可createApp；8页无hydration警告/错误，三个工具可输入/示例/清空/复制/异常恢复；不得整页client-only掩盖正文缺失或静默退回重挂载 | Dev Done |
| SSG-04 | 初始一致性与隐私 | 文本五项初始0，JSON初始空/缩进2，URL初始空/component；默认数字展示格式固定、主题由CSS处理；不序列化用户输入；页面离开/重入/刷新保持原清空契约；慢Hydration期间不能丢失用户已键入内容 | Dev Done；完整隐私/系统行为属Release Ready |
| SSG-05 | 页级head | 8个原始HTML各含唯一title/description、lang=zh-CN、一个main/h1、当前导航和说明；客户端接管与切换使用同一PageHead，404不继承工具head | Dev Done |
| SSG-06 | 路径与资源 | /映射index.html，其余尾斜杠页映射对应目录index.html；base建议固定/；逐页CSS/脚本引用可解析且存在，嵌套刷新无404资源、无未样式正文；已知无斜杠不产生多余历史或循环 | Dev Done本地；平台重定向属Release Ready |
| SSG-07 | 404双层一致 | 生成顶层404.html，中文404/noindex/无canonical，body不回显未知路径；未知不同前缀路径的Hydration不出错；客户端导航仍catch-all，HTTP状态不靠JS伪造 | Dev Done文档与本地404；真实HTTP404属Release Ready |
| SSG-08 | 托管回退 | 产物能静态托管，已知页直接命中文件，顶层404关闭Cloudflare默认SPA兜底；未知页/缺资源/API不被HTML200吞掉，记录真实状态/Content-Type及无斜杠状态链 | Release Ready，须单独授权平台验证 |
| SSG-09 | SEO环境及产物 | 未批域名默认preview：原始/客户端均noindex，无canonical/sitemap/robots产物；正式模式缺失/非法批准origin使构建失败；正式域名和索引策略批准后，canonical/sitemap由同一目录生成，去query/hash，404/API/别名排除，lastmod无依据省略 | Dev Done环境模型/负向测试；正式产物属Release Ready |
| SSG-10 | 构建完整性 | 路由与页面目录双向核对；重复名称/路径/输出文件、漏页、无head/h1、资源遗漏、任一渲染失败均非零退出；不得静默跳页、输出旧页或部分成功发布；重复构建无残留 | Dev Done |
| SSG-11 | 单元与组件迁移 | 原151项用例逐项建立旧→新映射，不改变预期/丢弃边界；纯函数及路由/head归Vitest Node项目，交互归Vue Test Utils+jsdom，独立清理全局/异步mock；保留Node对照直到迁移审阅完成 | Dev Done（若本轮授权该测试迁移） |
| SSG-12 | 浏览器与HTML自动验证 | Playwright分别禁JS检查原始HTML/浏览器解析DOM、启JS检查Hydration与交互；Chromium/Firefox/WebKit均有结果，Chrome通道另列；捕捉console与pageerror，检测器负向夹具必须能令测试失败；不把WebKit等同Safari、模拟视口等同真手机 | Dev Done核心Chromium+真实Chrome；其余引擎覆盖须记录，完整环境属Release Ready |
| SSG-13 | CI与证据 | 分阶段执行类型/回归→SSG完整性→浏览器；依赖阶段失败不得放行后续门禁；记录commit+dirty补丁摘要/锁文件、Node/浏览器版本、HTML/JSON报告及失败trace，不自动部署；缺凭据/浏览器不得记通过 | Dev Done批准接入的CI范围；完整发布CI属Release Ready |
| SSG-14 | 性能、回滚与扩展 | 同设备/版本/样本记录CSR/SSG构建时长、产物体积、LH和工具响应；保持原工具预算，LH90仅初步目标；新增页面仅通过目录+组件+测试接入生成机制；SSG失败保留原CSR开发能力但不静默发布降级 | Dev Done机制与风险记录；实机预算及发布回滚属Release Ready |

### 页文件清单（8个已知页面 + 1个404文档）

| URL | 最终静态文件 |
| --- | --- |
| / | index.html |
| /office/ | office/index.html |
| /office/text-statistics/ | office/text-statistics/index.html |
| /developer/ | developer/index.html |
| /developer/json-formatter/ | developer/json-formatter/index.html |
| /developer/url-encoder/ | developer/url-encoder/index.html |
| /about/ | about/index.html |
| /privacy/ | privacy/index.html |
| 任意未知路径 | 404.html（非新增可索引工具路由） |

所有初始表单为空，不在生成阶段填示例。禁JS时工具不计算，页面显示明确“工具交互需要JavaScript”说明。推荐在Hydration就绪前禁止工具输入/处理，避免慢网络下用户输入被初始化覆盖；这是拟批准的交互准备状态，不改变算法或输入上限。相关实现必须统一覆盖输入法、复制、示例、清空，并保证Hydration前后第一棵树一致，详见设计。

## 分层门禁与审批

M1-06A完成仅代表文档可审阅，不能称SSG或测试框架可用。M1-06B具体编码包建议为SSG-01～07、09～10、11～13获批部分及14的扩展/回滚设计；必须先明确SSG与测试迁移是否同轮授权。核心HTML/Hydration/工具交互失败、用户输入泄漏或数据丢失阻塞Dev Done，不能移到发布遗留绕过。

Dev Done沿DD-01～07：批准范围实现、对应自动化/类型/构建、真实浏览器核心Hydration与工具/路由回归通过、无阻塞缺陷、遗留记录齐全。CI尚未授权接入时只能列后续事项；若已授权且CI失败不能写通过。所有计划测试未执行，本轮仅静态源码审查。

Release Ready沿RR-01～07：在上述基础上补四浏览器各两个主版本、真实Safari/手机、完整无障碍与运行时隐私安全、各工具设备性能、正式域名SEO产物、Cloudflare直达/404/缓存及生产部署前审查。Playwright WebKit/Firefox为自动化引擎结果，不能自动关闭真实产品全版本验收。部署仍需独立授权。

## 待批准

ADR-018原生SSR构建+自定义SSG，ADR-019测试迁移与CI，ADR-020静态产物/404/SEO环境边界；以及Hydration前禁用交互、固定数字展示locale、生成器资源超时参数和性能测量方案。当前无域名不阻塞preview模式方案设计，但阻塞正式SEO/发布验收。见[design](design.md)和[tasks](tasks.md)。
