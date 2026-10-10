# 002 文本统计技术设计

状态：M1-02 实施设计，按用户 2026-10-10 授权同步，不安装依赖。依据：[spec.md](spec.md)、[前端架构](../../architecture/frontend.md)。

## 实际基线与差异

实际 src 已有 App.vue、views/HomeView.vue、components/layout/SiteHeader.vue、SiteFooter.vue、components/tools/ToolCard.vue、types/tool.ts 和 data/tools.ts；App 提供唯一 main。现有主题变量包括 --color-background、--color-surface、--color-text、--color-muted、--color-accent、--color-focus、--space-* 和圆角变量，复用而不重建主题。

架构总览及 001 spec/design 中部分“欢迎模板/未创建/未授权”描述是历史基线；实际实现和授权见 [001 tasks](../001-site-shell/tasks.md)。001 完整验收仍未关闭，不把其称为全部通过。当前 package.json 只有 Vue 运行时依赖，无 Vue Router、Vitest、Playwright 或 test 脚本。本轮实现 002 并更新其三份规范，不修改无关工具或历史验收结果。

## 规划模块

| 文件 | 职责 |
| --- | --- |
| src/types/textStatistics.ts | 统计结果、分析返回联合类型 |
| src/utils/textStatistics.ts | 固定 W、逻辑换行判断、限额检查与纯统计函数 |
| tests/textStatistics.test.ts | Node 24 内置 node:test 及 node:assert/strict，直接测试 TypeScript 纯函数；Vitest 后续补充 |
| src/views/TextStatisticsView.vue | 输入、示例/清空/复制、统计显示与状态管理；分区 h2 由 HomeView 提供 |
| tests/textStatisticsInteraction.test.mjs | 复用已安装 Vue 编译器、TypeScript 与自定义渲染器，验证事件逻辑，不模拟真实浏览器 |
| src/views/HomeView.vue、components/tools/ToolCard.vue、types/tool.ts、data/tools.ts | 本页试用状态、真实锚点、展开/收起工具；无路由文件 |

初版在页面内使用 textarea、button、dl 等原生元素，不抽象只有一个调用点的编辑器或统计卡片。输入/复制等状态仅在页面实例内；无需 Pinia、后台或 composable 框架。

## 类型与纯函数契约

- TextStatistics：characterCount、nonWhitespaceCharacterCount、segmentCount、lineCount、nonEmptyLineCount，均为非负整数。
- TextAnalysis：`{ status: 'ok', statistics: TextStatistics }` 或 `{ status: 'too-long', limit: number, actualCodeUnits: number }`。
- analyzeText(text: string): TextAnalysis：先以 text.length 检查固定上限 100000，再统计；不依赖 DOM、Vue、时间、网络、存储或全局可变数据；相同输入相同输出。超限不返回旧结果，不抛业务异常；意外运行异常由组件边界处理。

固定 W 与所有规则以 spec 为唯一行为依据。采用 for…of 按码点扫描，不使用 Array.from 大数组，不做 Unicode 规范化，不为统计修改原文。单次扫描维护字符总数、去空白数、是否处于词段、当前行是否非空、上一字符是否 CR；遇到 CRLF 时只增加一次逻辑换行，但两个字符仍各自进入字符总数。非空字符串先设总行数 1；每次行边界提交上一行非空状态，结尾提交末行。W 的分类与换行分类独立，VT/FF 只分词不分行。时间复杂度 O(n)，辅助状态 O(1)，不生成按行/词段拆分的大数组。

## 数据流与交互状态

textarea 实际值 → 页面 text ref → 限额判断 → analyzeText → 统计 dl 或错误。正常输入直接更新，不预设防抖等待；输入法组合期间用 composing 标志暂停统计并展示输入中，结束后分析实际值。不要仅依赖 v-model 隐含行为；事件实现需覆盖 compositionend 后再次 input 的情况，结果以最后输入为准。

页面状态：text、analysis、composing、calculationError、message、copying、revision 与 disposed。仅将有效分析值展示为数字；超限/意外异常置无效。清空递增 revision，复位所有结果/反馈并聚焦 textarea。示例按钮仅在空字符串且未组合输入时启用，处理函数再次检查，绝不覆盖非空输入。示例建议“你好 world\nVue 3”，并展示统计规则帮助。

复制在用户点击事件中捕获当前 text 和 revision，调用安全上下文下可用的 navigator.clipboard.writeText；pending 时防止重复提交。只在 Promise 成功且 revision 未变时显示成功；编辑/清空/示例替换后忽略旧 Promise 的完成反馈。缺失 API、权限错误及失败都聚焦/选中输入并显示手动复制说明，不写入日志，不使用 execCommand 或读剪贴板。浏览器可能规范化换行，承诺复制当前 textarea 字符串而非原剪贴板字节。

## 本轮页面集成（不安装路由）

正式 URL 仅预留 /office/text-statistics。本轮不创建 router/、不调用 pushState、不监听 location 模拟路由、不新增 hash 路由。HomeView 保持 h1 和已有分区，在 #text-statistics 分区以按钮展开/收起 TextStatisticsView（h2 由 HomeView 分区提供，组件不重复标题）。收起通过 v-if 卸载，重开为空；复制的异步回调须在卸载后失效。

Tool 元数据扩展 planned / preview 可辨识联合：preview 具有真实 anchor，界面显示“本页试用”，不声明正式上线。仅文本统计为 preview，JSON/URL 保持 planned。ToolCard 的试用链接跳转至真实分区；展开工具按钮维护 aria-expanded / aria-controls，收起后焦点返回切换按钮。现有页头所有锚点仍位于同一首页。

首页文案改为可试用文本统计、其余规划中，并准确说明文本统计的本地处理与不持久化。首页 SEO 沿用现有首页元数据；独立页面元数据、History 直达/刷新/返回、托管回退及预渲染在获准路由阶段实施，不用首页响应冒充独立 URL 已完成。

## 样式与可访问性

沿用现有容器、CSS Variables、640/1024 断点与系统明暗偏好；小屏统计可纵向排列，长文本仅在输入框内部滚动/软换行，不产生页面横向滚动。textarea 有 label 和规则说明关联；错误通过 aria-describedby 关联，超限使用 aria-invalid。输入框与按钮显式 focus-visible，不能依赖目前只覆盖链接等元素的全局选择器。

统计使用 dl/dt/dd；不逐键让整个结果区成为 live region。组合输入/错误/复制/清空结果用单一 polite 状态区，避免抢夺焦点或重复朗读。清空后焦点回输入，复制失败后选中文本。正文对比度、屏幕阅读器及键盘行为必须实测。

## 验证策略与阻塞项

纯函数测试按 spec U01～U19 和全部 W 成员参数化，覆盖限额边界、代理对、孤立代理项及非空行。Vitest 已获选型批准但未安装；本轮采用 Node 24 的 TypeScript 类型擦除与内置 node:test，不改 package.json。命令为 node --test tests/textStatistics.test.ts tests/textStatisticsInteraction.test.mjs。组件测试用 Vue 编译器编译实际 SFC，再在自定义宿主中派发事件；只验证状态与事件逻辑，不声称覆盖真实 DOM、布局、剪贴板权限或输入法行为。类型导入使用相对 .ts 路径，且为 import type，运行时不依赖别名解析。Vitest 安装配置后续授权。页面先按人工流程测试，无 Playwright 接入计划。正式实现必须执行 type-check、build、获准后的单元测试及四种浏览器两个主版本的核心验收。

性能用 spec 设备/输入规模/次数/时延标准记录各次数据，以事件到更新绘制为交互时延，纯函数单独测量；真实绘制可用双 requestAnimationFrame 采样并记录方法局限，不能用纯函数耗时代替页面体验。超限只检查码元长度，不全量扫描；超大粘贴本身的系统分配耗时不保证可控。若预算失守，报告并重新评审限制或调度方案，不自动添加依赖或 Worker。

本轮实现授权已获得，001 编码前构建复检通过；浏览器、真实手机和性能验收缺口继续记录。正式路由、Vitest、域名、预渲染和发布属于后续未授权范围，不阻塞本页工具实现。
