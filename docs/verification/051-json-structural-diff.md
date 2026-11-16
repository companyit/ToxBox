# 051 JSON结构对比验证

日期：2026-11-15（Asia/Shanghai）。基线HEAD `40aa4bf` 加已有044/045/048/050等工作区变更。负责人在051具体规格后选择JSON结构对比，按 [051规格](../specs/051-json-structural-diff/spec.md) 实施，不恢复049哈希或046翻译，不部署。

## 实际实现与文件

新增/developer/json-diff/，对象按字段对应、忽略键顺序和字符串外空白，数组按索引。输出增删/修改、JSON Pointer路径和两侧完整紧凑JSON值，缺失侧显示不存在；类型变化及新增/删除容器整体报告，不识别移动/主键，不生成JSON Patch。

- jsonReader.ts从042/044提取Map、原数字词元、严格语法、Unicode/重复键/深度/节点保护和编码器。jsonTable.ts保留兼容扫描、映射及对外导出，组合两类固定错误，不改变CSV语义。
- jsonDiff.ts：精确十进制规范为符号/系数/BigInt指数；不经Number舍入或巨大指数展开，1/1.0/1e0相同，-0与0相同。输入各10万码元、30层/5万节点；最多2000差异、结果内容和报告各最多100万码元，超限无部分结果。
- jsonDiff.worker.ts：本地解析/比较，只回传固定错误代码/侧别/位置或完整结果。JsonDiffPage.vue支持双侧输入/IME、完整示例防覆盖、交换/取消/清空、类型筛选、100项分页、按需完整报告/复制、过期任务及离页清理。
- 页面、懒路由、开发分类、工具排序/指南/搜索、敏感路径及广告排除、SSG/runner清单同步。22工具（办公14/开发8）、30HTML、22指南，24页索引和048四页广告白名单不变；新页noindex、无GA/广告。不改依赖/锁、031/050算法与容量或正式dist。

## 已执行检查

| 检查 | 实际结果 |
| --- | --- |
| 严格读取核心提取后原Vitest | 52文件382项通过，原CSV兼容/精度/重复键/Unicode及语法变异对照保留 |
| 新模块完整Vitest | 54文件395项通过；新增7项算法、5项组件、1项新路由，循环样本不另计 |
| 类型及runner内preview构建 | 退出0，生成30HTML；不改正式dist |
| npm run test:ssg | 18文件20项通过，新增空态/noindex/指南/敏感隔离检查 |
| npm run test:inventory | 154项历史身份/源SHA/唯一owner及负向夹具通过，不计新增业务测试 |
| preview广告准备审计 | 30HTML、120页脚、22指南通过，preview无广告脚本 |
| Firefox启动探测 | 退出1，Could not find profile folder，未进入新模块功能测试；不重装缓存或引用历史通过 |

算法覆盖六类根值、键顺序、数组索引、缺失/null、类型及容器整体变化、转义路径/空键/原型键、大整数/高精小数/巨大指数/-0、严格语法及各资源预算。组件覆盖示例防覆盖、侧别错误/隐私、IME、取消/超时/迟到结果、分页/全局统计/跨页报告及复制失败/竞态/离页。

## 首轮浏览器与修正

新模块搜索用例最初用“JSON 结构”并预期只返回一个工具，但JSON格式化简介也包含“JSON结构”，因此三宽度搜索计数失败。业务搜索行为正确；随后把测试词改为明确的“结构对比”，保留唯一入口、精度、结构、复制、错误及隐私后续断言。首轮日志/结果保留，不把未执行后续流程算通过。

首轮运行期间中止请求被自动审批拒绝（审查时未取得可采纳的PID命令输出），未终止进程，原轮正常结束；不改用间接终止绕过。另在原preview服务器以修正搜索词做Chromium/WebKit完整目标流程补查通过，见 [目标补查](evidence/json-diff-2026-11-15/targeted-flow.log)。

首轮全站580项中574通过、6项搜索计数失败，无跳过，整体退出1，见 [首轮记录](evidence/m106c3/runs/2026-11-14T22-43-41.043Z-4299/run.json)。修正测试查询后，从当前源重新构建preview并完整复验，**580/580通过**（各引擎290项），无失败/跳过/重试，构建/测试退出0、端口释放。新模块每引擎3种宽度加1组资源/IME流程，共8项通过，不能把重复样本当新增功能数。

[最终runner](evidence/m106c3/runs/2026-11-14T22-50-36.419Z-5418/run.json)、[完整结果](evidence/m106c3/runs/2026-11-14T22-50-36.419Z-5418/results.json)、[源/测试/锁/配置/产物绑定](evidence/m106c3/runs/2026-11-14T22-50-36.419Z-5418/build-sha256.json)、[最终日志](evidence/json-diff-2026-11-15/e2e-final.log)保留。原JSON格式化、CSV/JSON、文件对比扩容及其他既有流程均保留验证，未靠移除行为断言获得通过。

## Node资源样本

[脚本](evidence/json-diff-2026-11-15/benchmark.mjs)使用项目现有TypeScript转译当前纯模块，预热1次/记录3次，未新增依赖。[结果](evidence/json-diff-2026-11-15/benchmark.json)：每侧10万码元相同字符串1.010～1.400 ms，2000差异1.458～2.839 ms，10万码元巨大指数16.060～17.121 ms，30层容器差异0.006～0.020 ms。这是Node纯算法测量，不含浏览器/DOM，不证明手机或总内存指标通过。

## 证据与限制

### 最终生产隔离与归档

`node --test tests/release/seo-growth.test.mjs` 6项通过，无失败/跳过：生产24页索引保持、既有SEO/所有权/广告脚本负向保留，Chromium/WebKit各30页原始head和hydration一致，并把JSON结构对比加入首页→工具→首页的广告执行哨兵隔离流程。全部广告请求使用本地替身，不连接Google。仅4页保留批准加载器，JSON结构对比和全部工具页无广告；生产广告准备审计30HTML/120页脚/22指南通过。

[生产日志](evidence/json-diff-2026-11-15/production.log)、[生产审计](evidence/json-diff-2026-11-15/production-audit.json)、[隔离候选引用](evidence/seo-growth/seo-1794697053921/candidate.json)、[30页和浏览器明细](evidence/seo-growth/seo-1794697053921/results.json)保留。候选为本地测试样例，不是正式移交/部署；报告追加后正式交付仍需从最终源重新构建。

实际查看 [375px](evidence/json-diff-2026-11-15/chromium-375.png) 和 [1440px](evidence/m106c3/runs/2026-11-14T22-50-36.419Z-5418/artifacts/json-diff-JD-结构路径、精度、筛选、错误和隐私-1440-chromium/json-diff-1440.png) 结果：路径、原值/新值、完整大整数、缺失/null、筛选/分页及报告入口清楚，无页面横向溢出；自动流程覆盖三宽度及200%字号，不代签其他截图、真实手机或读屏。

[最终单元组件](evidence/json-diff-2026-11-15/unit-final.log)、[本轮源码摘要](evidence/json-diff-2026-11-15/source-sha256.json)、[保持性核对](evidence/json-diff-2026-11-15/preserved-inputs.json)保留。050算法/读取/Worker/页面、依赖/锁和此前303个正式dist文件摘要未变；新JSON功能只存在当前源码及测试候选/preview中。

[解析提取回归](evidence/json-diff-2026-11-15/reader-regression.log)、[算法组件](evidence/json-diff-2026-11-15/unit.log)、[静态](evidence/json-diff-2026-11-15/ssg.log)、[历史身份核对](evidence/json-diff-2026-11-15/inventory.log)、[preview审计](evidence/json-diff-2026-11-15/preview-audit.json)、[首轮浏览器日志](evidence/json-diff-2026-11-15/e2e.log)、[Firefox探测](evidence/json-diff-2026-11-15/firefox-probe.log)保留；最终浏览器/生产隔离结果及绑定另行追加。

仅支持严格JSON，不支持文件导入下载、Patch/合并、数组移动或主键匹配、字段忽略/自动修复。大字段路径导致结果重复过大时会整体拒绝，不静默丢失内容。真实手机/读屏/中文输入法/系统剪贴板及负责人签收待执行；模拟事件不能代签。正式dist仍为048版本，本轮只更新dist-ssg测试预览；未部署、未操作广告后台或真实外发输入。
