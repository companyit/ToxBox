> 阶段确认更新（2026-10-10）：负责人在M1-06A请求中明确审查确认M1-05B达到Dev Done。下文“提交负责人确认”为当时交付记录；Release Ready仍未完成。本次没有新增浏览器测试或UAT结果。

# M1-05B 独立路由与SEO基础验收归档

日期：2026-10-10。执行者：Codex。依据 [005规格](../specs/005-routing-seo/spec.md)、[设计](../specs/005-routing-seo/design.md)、[任务](../specs/005-routing-seo/tasks.md)、[质量门禁](../quality/gates.md)。ADR-016、017核心方案本轮获负责人批准；不授权预渲染、托管配置或生产发布。

结论：**Dev Done开发条件满足，提交负责人阶段确认；Release Ready未完成。** 本轮没有负责人自报UAT，不把002自报UAT或历史Chrome记录写成本轮实测。完整浏览器兼容性、真实手机、读屏和正式托管仍待验证。

## 改动与批准范围

新增router/index.ts、routes.ts，data/pages.ts，utils/seo.ts，composables/useRouteAccessibility.ts，components/layout/ToolPageLayout.vue和views/pages下7个页面文件（分类共用组件、三个工具薄包装、关于、隐私、404）。修改App/main、首页、Header/Footer、ToolCard、工具元数据/类型、main.css和index.html。新增tests/routingSeo.test.ts，调整原JSON/URL交互测试末尾的集成挂载位置断言，保留其计算/复制/卸载测试和数量。

package.json只增加vue-router ^4.6.4；锁文件新增vue-router及必要@vue/devtools-api 6.6.4传递条目，未修改其他已有锁定版本。实际Vue3.5.43满足Router4.6.4的Vue ^3.5.0 peer约束。未安装其他测试/head/渲染框架。

同步ADR、前端架构、005三份规范与任务；本归档和evidence/m105保存实际证据。已有004工作区文档/源码/证据未回滚。对实施前摘要逐一比对确认三个原utils算法、三个原工具View和其纯函数测试保持字节不变；首页与工具导航按本轮授权迁移。改动清单见[本轮文件清单](evidence/m105/changed-files.json)。

## 自动化、类型与构建

环境Node v24.21.0，Vue3.5.43，Router4.6.4，Vite8.3.4；执行日期2026-10-10。

| 实际命令 | 最终结果 | 覆盖及限制 |
| --- | --- | --- |
| npm install vue-router@4 --ignore-scripts --no-audit --no-fund | 成功，安装4.6.4 | 首次沙箱DNS失败，经自动审批允许的联网执行成功；未额外新增直接依赖 |
| npm run type-check | 退出码0 | 初次query类型不符合Router类型，修正LocationQueryRaw后复验通过 |
| npm run build | 退出码0 | 最终75模块，入口JS gzip38.18kB；按路由拆出页面chunk，不推断Lighthouse或性能达标 |
| node --test tests/*.test.ts tests/*.test.mjs | 151通过、0失败、0跳过 | 原文本62、JSON33、URL39，共134项回归；新增路由/head17项 |
| npm ls --depth=0 | 退出码0 | Router4.6.4，没有Vitest/Playwright/Pinia |
| git diff --check | 退出码0 | 最终文档完成后复核 |

[自动化完整输出](evidence/m105/automated-tests.log)、[被测源码/测试/依赖/dist摘要](evidence/m105/tested-file-sha256.json)。Node测试用真实Router的内存History、组件替身及head适配假宿主；不把这些当浏览器History、焦点或DOM验收。

首轮151项中149通过、2失败：一项为head测试假宿主复制节点的remove回调错误，修正测试宿主；另一项发现规范化一律replace会覆盖来源历史。修正为提交前重定向、保留原导航push/replace意图后，返回来源测试通过；首次直达仍由Router初始replace处理，无中间非规范历史。最终再次类型/构建/151项通过，不隐去早期失败。

## 真实Chrome执行环境与证据

最终结果时间2026-10-10T13:39:50.431Z（北京时间21:39:50）。真实已安装Chrome154.0.8037.98，headless、独立临时配置；Darwin27.0.0 arm64，CPU报告Apple M4，不由CPU推断具体Mac型号。本地生产构建预览http://127.0.0.1:4176，不是Cloudflare或生产部署。

CDP驱动使用原生Node WebSocket/fetch，输入通过真实浏览器textarea编辑，鼠标/Tab/Enter通过CDP事件。模式选择及路由竞态使用页面DOM/Router运行时注入；复制缺失/拒绝/延迟、加载失败均为合成故障，不代表真实系统权限拒绝。应用不读取剪贴板，读回只在验收驱动中执行。没有系统IME、外部编辑器或实际读屏测试。沙箱监听/Chrome启动/CDP连接初次受限，经自动审批允许的执行权限成功运行，不作为产品缺陷。Chrome有CVDisplayLink告警，不据headless环境承诺实际屏幕性能。

- [可复核驱动](evidence/m105/browser-check.mjs)、[33项结构化结果](evidence/m105/browser-results.json)、[浏览器事件](evidence/m105/browser-events.json)、[AX树](evidence/m105/accessibility.json)。最终33项通过、0失败、0页面Runtime.exceptionThrown。
- [375桌面视口](evidence/m105/url-375-mobile-false.png)、[768桌面视口](evidence/m105/url-768-mobile-false.png)、[1440桌面视口](evidence/m105/url-1440-mobile-false.png)、[375手机模拟视口](evidence/m105/url-375-mobile-true.png)、[深色](evidence/m105/url-dark.png)。均DPR1；手机模拟不是真实手机。已目视375手机模拟截图所示区域，未见按钮遮挡；截图不是全页完整视觉验收。
- [工具URL原始HTML响应](evidence/m105/raw-tool-response.html)：初始HTML只有首页head和空app入口，无工具页h1/正文；动态客户端SEO不能冒充静态内容可见。

首轮浏览器29通过、1驱动失败：键盘步骤中测试脚本选择器引号错误，报office未定义，应用无Runtime.exceptionThrown。修正驱动后32项通过；最终增加迟到加载失败竞态防护及复验，33项通过。不得把驱动故障登记为未解决产品缺陷。

## 路由与SEO验收矩阵

| 需求 | 本轮实际结果 | 发布/人工遗留 |
| --- | --- | --- |
| RSEO-01 | 8页+404、唯一main/h1、共享Header/Footer和分类当前状态在真实Chrome通过 | 四浏览器各两个主版本 |
| RSEO-02 | 首页三卡片进入正确独立页，分类、旧6个hash目标唯一、迁移链接可用；首页无textarea | 全版本及额外长文案/空分类历史覆盖 |
| RSEO-03 | 三工具切页卸载、返回/刷新为空；URL pending复制后切JSON不污染提示，通过 | 系统表单恢复、系统复制完整矩阵及完整隐私核查 |
| RSEO-04 | 8页逐一直达/刷新/新标签通过；无斜杠query/hash规范化及返回来源、前进后退通过 | 真实托管HTTP深链与重定向 |
| RSEO-05 | 本地Vite已知页可访问，未进行Cloudflare配置或HTTP资源边界验证 | H01～03待验证，不能认定托管通过 |
| RSEO-06 | 站内和直达未知路径客户端404、返回首页、noindex/无canonical、不回显路径通过；本地直达HTTP200 | 真实HTTP404未实施/待验证 |
| RSEO-07 | 8页直达/刷新、连续切页/返回均独立title/description，404清理旧head、lang正确 | 原始HTML独立head/正文需预渲染另行实现 |
| RSEO-08 | 当前预览noindex/无canonical；纯函数测试正式origin拒绝与正确模型通过，测试域名不进入产物 | 批准正式域名及正式产物S01待验证 |
| RSEO-09 | 未生成sitemap/robots，未假造域名或lastmod | S02～03及正式索引策略待批准/验证 |
| RSEO-10 | A/B/C评估已交付、分阶段原则获批；未实施SSR/预渲染 | 具体方案、P01～03、hydration仍待授权/验证 |
| RSEO-11 | 新页H1焦点/页首、back保存位置与forward、hash焦点、缺目标回顶、快速导航最终head/通知、加载失败重试及过期失败防护通过 | 实际VoiceOver通知体验、更多浏览器 |
| RSEO-12 | 8页375/768/1440桌面及375手机模拟无横溢；真实Tab/Enter跳主内容与分类导航，深色/AX证据通过 | 完整键盘、200%缩放、对比度、读屏、真实手机 |
| RSEO-13 | 134旧工具回归全通过，三工具Chrome核心/剪贴板读回、状态清除通过，类型构建通过 | 原001～004多环境/设备/定量发布遗留保持 |
| RSEO-14 | 文档保留/api/v1/，无后端/请求/接口实现，内存路由未知API/资源不当作已知页面 | 真实托管API/缺失资源不吞HTML待H03 |

## 三工具真实页面回归详情

- R01文本：“你好 world\n😀”得到(10,8,3,2,2)；100001输入完整保留；清空回输入焦点；写入API故障注入后选中10码元原文本。真实复制读回中文/Emoji一致。
- R02 JSON：对象/数组/字符串/数字/布尔/null六顶层压缩准确，2/4缩进准确；非法语法、不安全整数9007199254740993、非有限1e400不留旧输出；重复键按后值输出。真实结果复制读回一致。其余数字/深度/输出边界由原自动化完整回归覆盖，不声称全部都在浏览器重跑。
- R03 URL：四操作、中文/Emoji/保留符、+/%20与decodeURI保留转义准确；非法UTF8无旧输出、100001保留、清空焦点回输入；复制结果读回一致，pending复制卸载无迟到反馈；HTML样本只作文本，无img生成或自动导航。

隐私观察：合成标记经输入/转换/切页后不在观察到的请求/日志事件、URL、local/sessionStorage、cookie、IndexedDB列表中。观察窗口/事件类型有限，完整控制台/异常/系统路径仍待发布核查，不宣称全面安全认证。

## 缺陷、修复与技术债务

| 记录 | 等级/性质 | 复现与处理 | 状态 |
| --- | --- | --- | --- |
| DEF-005-01 | S1 历史导航功能缺陷 | 从首页push无斜杠办公路径，一律replace覆盖首页条目，back无法回来源；改提交前规范化且不强制replace | 已修复；Node和Chrome返回来源复验通过 |
| DEF-005-02 | S2 竞态可用性缺陷（审查发现、补充合成验证） | 慢路由加载在新页成功后才失败，旧onError可能覆盖新页提示；按最新待导航目标过滤，重试catch不写旧错误 | 已修复；最终Chrome迟到失败用例通过 |

类型query与假宿主remove、驱动引号问题均已修正复验，不是未解决产品缺陷。目前已测范围无已确认阻塞缺陷。

技术债务/限制：无Vitest/npm test整合；自定义交互宿主须随Vue编译器升级复核；路由为当前浏览器入口，未来预渲染需要应用工厂与SSR安全适配并重新验证；客户端head不提供原始HTML页面内容；真实HTTP404与正式SEO产物未实施；全面兼容性、无障碍、手机和性能证据不足。旧锚点默认保留，删除周期需后续批准。

## 双层门禁及人工补测

DD-01获批客户端范围有实现/证据；DD-02 151测试通过；DD-03类型通过；DD-04构建通过；DD-05真实Chrome核心路由和三工具通过；DD-06已发现功能问题修复复验、无已知阻塞缺陷；DD-07发布缺口完整归档。**开发条件满足，阶段确认提交负责人；Release Ready未完成。** 不将V02全部计划场景、完整B07/08或任何H/S/P任务虚写为通过。

剩余操作：

1. 记录四浏览器最新/前一稳定主版本和系统，重复八页直达/刷新/前进后退、三工具、hash、复制及焦点；Safari/Firefox未测保持待验证。
2. 真实手机记录型号/系统/浏览器/方向，检查导航、长输入/输出、所有按钮；桌面完整Tab/Shift+Tab/Space/Enter、200%浏览器缩放、实际VoiceOver/读屏与全状态对比度留记录。
3. 实际系统IME提交/取消、外部应用复制及真实权限拒绝/手动复制，核对三个工具；合成故障不是系统操作证据。
4. 正式域名、预渲染/托管方案另行审批后，执行H01～03、S01～03、P01～03，核验真实HTTP状态、canonical/sitemap/robots、原始HTML内容与hydration。
5. 真实设备按各工具规格记录逐次性能，补Lighthouse报告和未达目标分析，不以构建时间或headless时延宣称达标；完成完整隐私、安全与生产部署前清单。

本轮浏览器与本地preview验收后停止；不部署、不提交或推送，不进入下一阶段。001～004历史遗留不自动关闭。
