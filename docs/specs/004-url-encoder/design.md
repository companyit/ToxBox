# 004 URL 编解码技术设计

状态：2026-10-10，Implement + Verify，已批准进入Implement + Verify。依据 [spec](spec.md)、[tasks](tasks.md)、[架构决策](../../architecture/decisions.md)、[质量门禁](../../quality/gates.md)。

## 实际基线与模块边界

已检查package.json、src及Git状态：Vue 3 + TypeScript + Vite；无Router、Vitest、Playwright、Pinia，无npm test/lint脚本。已有Node内置算法测试和Vue编译器自定义宿主交互测试，不等于已安装测试框架。src/views/HomeView.vue以独立ref/展开按钮及v-if卸载两种工具，data/tools.ts作为卡片数据来源，types/tool.ts的preview锚点当前只允许#text-statistics/#json-formatter。URL卡片仍planned。src/assets/base.css/main.css提供主题、布局及断点。现有未提交改动保留，仅按本轮授权修改URL必要集成，保留已有改动及原工具语义。

| 实现文件/修改点 | 职责 |
| --- | --- |
| src/types/urlEncoder.ts | 模式、操作、输入/结果、错误联合类型 |
| src/utils/urlEncoder.ts | 限额、原生API选择和异常映射纯函数 |
| src/views/UrlEncoderView.vue | 输入/模式/只读结果、示例/清空/复制及局部状态 |
| tests/urlEncoder.test.ts | Node内置纯函数用例，固定预期值 |
| tests/urlEncoderInteraction.test.mjs | 现有Vue编译器/自定义渲染宿主事件测试 |
| HomeView.vue、data/tools.ts、types/tool.ts | 未来增加#url-encoder分区、独立展开状态及preview锚点类型；不修改文本/JSON语义 |

沿用003已验证的输入—显式操作—只读结果—复制revision模式及原生表单元素，不复制其JSON算法；只借鉴交互模式，不重构已有工具或提前抽取通用编辑器/状态框架。组件负责DOM/剪贴板，纯函数不依赖Vue或浏览器页面。空串返回empty状态，不属于错误。

## 类型与纯函数契约

- UrlMode = 'component' | 'uri'；UrlAction = 'encode' | 'decode'。
- UrlRequest：input:string、mode:UrlMode、action:UrlAction。
- UrlErrorCode：input-too-large、invalid-unicode、invalid-encoding、unexpected。
- UrlResult：`{status:'empty'}`、`{status:'ok', output:string}` 或 `{status:'error', code:UrlErrorCode}`。不附原文、原始异常或部分输出。
- processUrl(request): UrlResult，确定性纯函数；独立常量URL_INPUT_LIMIT为100000。先检查input.length，再判断严格空字符串（不trim），然后按mode/action选择四个原生函数。严格空串直接返回empty非错误状态，不调用原生函数。成功不修改输入、不规范化Unicode、不替换加号或已有百分号。不以“是URL”或输入猜测选择API。
- 捕获URIError：encode映射invalid-unicode，decode映射invalid-encoding；其他异常映射unexpected。输入超限优先于字符合法性检查。若后续新增运行时请求入口，应另定参数校验，不把当前内部TypeScript契约当公开API。

不自己解析UTF-8，不用正则替代原生错误判断，不用TextDecoder宽松替换、toWellFormed或新依赖。原样孤立代理项的decode遵循原生保留，百分号表示非法UTF-8仍失败。Unicode输入/输出规则唯一依据是spec，不能与文本统计W集合或JSON空白规则混用。

时间成本与输入/输出长度相关，内存包含输入和结果；有效编码输出上界9×input.length，解码不会扩张码元长度。没有原生同步函数超时取消保证，限额和人工设备测量是主要保护。输出不得为了显示性能静默截断；是否需要进一步缩小限额须评审D-004-02。

## 页面状态和数据流

状态：input、mode（初始component）、result（初始null）、composing、processing、copying、message、revision、disposed，以及inputEditor/outputEditor引用。error/output从result及限额状态派生。mode选择用原生select，操作分别为“编码”“解码”。

textarea实际值 → input ref → 用户按钮 → processUrl → 只读结果/中文错误。任意input/compositionstart/模式变化/操作开始先invalidate：revision递增、result=null、message清空；超限编辑直接显示限额错误，按钮禁用。composition期间保留实际值、禁用执行/示例/清空/模式/复制；结束同步实际值，只恢复手动操作，不自动调用函数。规范化换行由原生textarea产生，不能声称恢复原剪贴板字节。

执行同一次原输入的一次转换，processing期间防重复，完成后仅当前结果可复制。只读textarea以绑定value展示字符串，允许内部滚动/软换行；不生成链接或HTML。复制捕获纯函数output，换行选区可能受浏览器规范化，页面帮助明确区别；%00等不可见字符只作文本值，测试按码元核对。失败必须令output为空，不把历史成功残留在另一个ref中。

示例固定“你好 world 😀”，input===''且非composition才允许，处理函数也检查；示例只填输入、保持当前mode、不执行。清空重置input/result/反馈/mode，焦点回input；无内容且mode/component等全初始时禁用清空。空输入执行后保持无内容状态，不制造错误。

### 剪贴板状态机

1. 非空当前成功output、非组合且!copying时，捕获output+revision；copying=true。
2. 仅在安全上下文且API存在时writeText；等待期间禁用再次复制，不读剪贴板。
3. resolve且!disposed、revision相同时，显示“结果已复制”。reject/缺API/非安全上下文且仍为同一revision时，聚焦并全选outputEditor，提示“无法自动复制，请选中结果后手动复制”。
4. 编辑/模式变化/清空/重新执行均不被pending阻塞，revision失效旧操作；旧回调不得显示消息或设置焦点。finally只解除实际结束的pending，不回填结果。清空不提前将copying=false。
5. onBeforeUnmount使disposed=true且revision递增；迟到回调不再触碰组件。重新挂载的状态独立，不受上一实例影响。

## 首页集成与隐私

本轮编码授权后将既有url-codec卡片设为preview、anchor=#url-encoder；扩展preview类型联合，无效规划链接不提前创建。HomeView以aria-expanded/aria-controls按钮切换独立UrlEncoderView，分区h2；收起后焦点回展开按钮、组件卸载。复用唯一main/h1、页头页脚与分类，不改变两个现有工具状态。

正式路径仅预留/developer/url-encoder，不创建router、不调用pushState/监听hash模拟页面。首页基础SEO复用，独立标题/描述、直达刷新返回及托管回退/预渲染留待路由/发布授权。URL工具的输入不得进入浏览器地址栏，即使看起来是一条正常URL也不自动打开或请求。

不写local/sessionStorage、Cookie、IndexedDB、日志、URL、分析事件或请求；不记录异常原文。不执行解码出的javascript:、data:或HTML，不用v-html/innerHTML/动态脚本；textarea readonly不是安全信任声明。所有错误使用固定中文枚举映射。刷新、收起重入恢复空状态，不保留历史。

## 样式、无障碍与验证

复用CSS Variables、640/1024断点、系统明暗偏好及现有工具按钮模式；长百分号串只在结果框内部滚动或软换行，页面不横向溢出。输入/结果/mode有显式label，帮助/错误用aria-describedby，错误关联aria-invalid；textarea、button、select可见focus-visible，操作按钮type=button。单一polite状态区播报操作反馈，不逐字播报全文。

先执行纯函数固定向量，再验证组件失效/组合输入/复制竞态，最后真实浏览器检查焦点、选区、键盘、共享回归与布局。Node自定义宿主不证明这些DOM/系统行为。已有95项自动化（002的62、003的33）是历史基线；未来须实际重跑回归，不沿用其通过状态代替URL验证。没有可用浏览器时阻塞相关Dev Done证据，不安装新框架替代授权。

本轮已批准实现并运行验证，C-004-01及D-004-01～03已确认。实际执行结果见tasks和验收归档；Release Ready继承既有项目门禁，原002/003/001遗留不因新增工具关闭。

## 本轮授权覆盖（2026-10-10，优先于起草待批说明）

项目负责人正式批准C-004-01、D-004-01～03及实现，P1-05/ADR-015已同步。空输入改为非错误无内容状态；100000码元限额确认；50ms/200ms改为初步实测目标，不作为未经验证的硬性验收门槛。模式、单轮、Unicode/加号/百分号、失败保留与结果失效、复制回退及内存处理沿用规格。原样孤立代理项解码保留，不声称Unicode有效。无新增依赖需求或关键技术阻塞，可以按顺序实施；生产部署与M1-05未授权。
