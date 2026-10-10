# 003 JSON 工具技术设计

状态：2026-10-10，已获本轮规格审批与实现授权。依据 [spec](spec.md)、[门禁](../../quality/gates.md)、[架构决策](../../architecture/decisions.md)。

## 实际工程与模块提案

实际 package.json 只有 Vue 运行时依赖；无 Router、Vitest、Playwright、test 脚本。现有 src/views/HomeView.vue、TextStatisticsView.vue、data/tools.ts、types/tool.ts、components/tools/ToolCard.vue 与主题样式可复用；002 已使用 Node 24 内置测试及自定义 Vue 渲染宿主。架构总览部分目录说明是初始化历史，不作为当前代码不存在的依据。

以下模块按授权顺序实现：

| 文件 | 职责 |
| --- | --- |
| src/types/jsonFormatter.ts | 操作、结果、错误类型 |
| src/utils/jsonFormatter.ts | 无 Vue/DOM 依赖的限额、语法校验、数值检查和转换纯函数 |
| src/views/JsonFormatterView.vue | 页面局部状态、按钮、输入/只读结果、复制与反馈 |
| tests/jsonFormatter.test.ts | Node 内置纯函数测试 |
| tests/jsonFormatterInteraction.test.mjs | 使用现有 Vue 编译器/测试宿主验证事件逻辑；不当作浏览器 |
| HomeView.vue、data/tools.ts | 获实现授权后增加 JSON 本页试用分区与元数据；保留文本工具行为 |

不提前提取共享复制 composable，先保持单一组件职责；不能为了复用重写文本统计。

## 类型和纯函数契约

JsonAction = 'validate' | 'format' | 'minify'，JsonIndent = 2 | 4。JsonRequest 包含 input:string、action、indent。JsonResult 为判别联合：validated（无 output，含语法成功说明）、converted（output:string）、error（code）。固定错误 code 为 empty、input-too-large、too-deep、invalid-json、unsafe-integer、non-finite-number、output-too-large、unexpected；只传枚举与限额，不附原文或浏览器错误消息。静态精度/重复键警示由界面始终显示，不根据不可靠的检测动态隐藏。

processJson(request): JsonResult 为确定性纯函数，无 DOM/网络/时间/存储/日志；不会把解析对象暴露给组件，避免 null/false/0 被真值判断误判。输入限制先于空白判断；空白只用 JSON 四个字符集合。扫描深度使用 inString/escaped/depth 状态，转义处理为逐字符切换，不能用简单括号正则。深度超限先返回；其余语法交给 JSON.parse，不手写 JSON 解析器。

JSON.parse 不用 reviver，得到局部 unknown；validate 成功即返回 validated（静态警示仍在）。format/minify 对最终解析树用迭代栈遍历值，检查 Number.isFinite 和 Number.isInteger 且 !Number.isSafeInteger；出现非有限值优先返回 non-finite-number，若无非有限值但存在不安全整数返回 unsafe-integer。不合并到其他对象，不执行对象内容、不变更 Object.prototype；__proto__ 作为普通解析属性保留。重复键被覆盖的原值无法由最终树检查，不声称检测全部原始数值风险。

输出长度判断提取为模块内纯辅助函数 checkOutputLength，阈值为 1000000，可单独测试精确边界；processJson 仅在序列化后调用该判断。

通过后调用 JSON.stringify(value, null, format ? indent : undefined)，检查结果长度。不支持 BigInt/函数/循环引用输入；用户只能输入 JSON 文本，但仍捕获 stringify/资源意外异常。不以 stringify(undefined) 作为成功：有效 JSON 顶层不可能是 undefined，防御性检查 output 类型。整体解析/遍历/序列化成本与输入/输出相关，内存包含解析树、输出与遍历栈；不承诺 O(1) 内存。同步 API 不可超时取消，限额是保护措施，性能不达标须回到规划评审。

## 组件状态与数据流

输入 textarea → input ref → 显式按钮 → processJson → validated/converted/error。组件状态 input、indent（初始2）、result、composing、copying、message、revision、disposed。结果使用 readonly textarea，空结果复制禁用；纯函数转换输出 "null"、"false"、"0" 都必须正常显示并可复制。

任何输入编辑、compositionstart、改缩进、执行校验/转换前，递增 revision 并清空旧 result/复制反馈。组合期间保留原输入、暂停操作；compositionend 只结束组合，不自动解析。重复同步点击不并发；处理期间禁用操作，不能宣称禁用按钮能消除同步主线程阻塞。

复制捕获 output+revision，成功/失败回调仅在未卸载且 revision 未变时可修改反馈或选区；pending 时禁止再次复制。失败聚焦/选中结果，而非输入；若旧结果失效不再聚焦或显示陈旧错误。清空/示例/重新处理/编辑不被 pending 阻塞；新结果出现而旧复制尚 pending 时继续禁止复制直到旧 Promise settled，不设置 copying=false 提前允许第二次复制。卸载使回调无效。复制本身不自动读取系统剪贴板。

清空复位所有内容、缩进和消息，revision 递增，焦点回输入；pending 状态按实际 Promise 生命周期处理。示例固定为 {"name":"WorkDev Tools","enabled":true,"items":[1,"你好",null]}，仅原输入===''且非 composing 时启用，处理函数双重保护。

## 集成、无障碍与数据边界

HomeView 以 #json-formatter 真实分区/展开按钮接入，分区 h2；组件不重复 main/h1。收起卸载恢复空状态；不动文本统计模块及其状态策略。正式路径仅预留 /developer/json-formatter；独立 URL/SEO 在后续路由授权后实现。开发者分类 JSON 仅实现并验证后才改为本页试用，URL 工具仍规划中。

复用 CSS Variables、系统明暗和现有断点。输入/结果各有 label，帮助说明用 aria-describedby，错误关联输入；操作反馈为单一 polite 状态区，不逐字朗读编辑内容。结果内部允许滚动，页面无横向溢出；原生按钮与缩进 select 可由键盘操作，焦点清晰。只读结果仍可选中手动复制。输入、输出与原始异常消息不得进入 URL、console、请求、持久化或 v-html；错误 UI 仅用固定中文消息。

## 验证与审批

纯函数按 [tasks 测试表](tasks.md)；组件测旧结果失效、IME、防覆盖、清空焦点调用和复制竞态；真实浏览器另测焦点/选区/系统剪贴板/键盘及首页共享回归。Node 自定义宿主不验证布局或系统权限。使用现有工具，无新增依赖。发布实测设备、兼容性、无障碍、隐私及性能保留独立证据。

spec D-003-01～03 已按本轮审批同步，实施采用原生最终值检查；有限小数仍有损，不能将警示方案写成无损处理。

## 本轮审批与数值方案审查（2026-10-10）

来源：项目负责人《M1-03 JSON 工具规格审批与编码授权》。已批准六类顶层值、手动操作、100000码元、原生JSON与独立纯函数、只读结果、本页试用与预留路径、复制回退及结果失效。保留规格100层/1000000输出保护和设备性能验证方案；预算未测不宣称满足。本节记录当前授权结论，不授权生产发布。

数值策略采用原规格“最终解析值”检查：校验仅确认语法；转换拒绝非有限数与不安全整数。有限小数的舍入、下溢、科学记法/负零变化按原生语义处理，始终显示精度警告，绝不宣称无损或完整原数字安全。要求精确数字的用户须保留原文并用JSON字符串表示。不使用正则检测数值或自行实现解析器；重复键后值覆盖，被覆盖值不参与最终树检查。

已研究 JSON.parse reviver context.source：[MDN兼容性数据](https://github.com/mdn/browser-compat-data/blob/main/javascript/builtins/JSON.json)列出Chrome114起、Edge镜像Chromium、Firefox135起、Safari18.4起支持；这是文档支持信息，不是本机四浏览器实测。该能力能提供原始primitive源码，但不会自动实现任意精度转换。本方案不依赖它，不使用JSON.rawJSON或polyfill；有/无context.source的浏览器都执行同一最终值检查和警告，没有静默弱化的回退。浏览器两个主版本完整验收仍待验证。参考 [MDN JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)。

审查：需求与验收一致，J14～16/J25覆盖数值拒绝与有损边界，J21～24覆盖资源/异常；无需额外依赖。已批准方案不要求无损小数或保留重复键，因此不存在阻止本轮编码的数值技术阻塞。如将目标改为检测/拒绝全部精度损失，应另行评审，不能把当前警示方案当作该能力。
