# 053 JSON结构对比文件导入验证

日期：2026-11-16。负责人明确要求实现文件导入，按[053规格](../specs/053-json-diff-file-import/spec.md)JFI-01～06实施，不改变051比较规则、052结果下载或部署范围。

## 修改与行为

- 新增`src/utils/jsonFile.ts`纯模块和`src/workers/jsonFile.worker.ts`同源读取Worker：仅.json、原始400000字节、解码100000个UTF-16码元，严格UTF-8；不去BOM、不规范化原文换行、不解析或舍入数值。结构校验仍由已有比较Worker执行，空文件可导入、比较时提示缺少输入。
- `JsonDiffPage.vue`新增双方选择/读取/取消/来源，成功才替换对应侧，不自动比较，仍可手动编辑。双侧独立版本阻止重选/编辑/取消后的迟到消息；比较、交换、示例在加载中禁用，导入使旧比较失效。失败与10秒超时保留原输入；清空、pagehide和卸载停止全部读取。
- 来源随交换移动，手动编辑撤销来源；文件名仅文本显示，不进入报告。IME停止对应侧读取并禁用新导入。原粘贴、严格JSON、精度、筛选分页及报告/复制保持。
- 同步工具指南、053规格/设计/任务、051范围补充及产品进度。无新增依赖、路由、上传、存储或广告，22工具/30HTML/22指南不变；052已有改动保留。

## 本轮验证

| 检查 | 实际结果与证据 |
| --- | --- |
| 单元/组件 | 55文件413项通过，新增4项纯模块、4项组件；[日志](evidence/json-file-import-2026-11-16/vitest.log) |
| 类型 | 最终新浏览器用例写入后检查通过，[日志](evidence/json-file-import-2026-11-16/type-check-final.log) |
| preview构建 | 通过，30HTML及新同源Worker，[日志](evidence/json-file-import-2026-11-16/build.log) |
| 静态 | 18文件20项通过，[日志](evidence/json-file-import-2026-11-16/ssg.log) |
| 历史身份 | 154项及负向夹具通过，[日志](evidence/json-file-import-2026-11-16/inventory.log) |
| Chromium/WebKit | 16/16通过，各8项、无失败/跳过/重试；[日志](evidence/json-file-import-2026-11-16/browser.log)、[结构化结果](evidence/json-file-import-2026-11-16/browser/results.json) |
| preview广告审计 | 30HTML、120页脚、22指南通过，无广告脚本，[结果](evidence/json-file-import-2026-11-16/preview-audit.json) |
| 绑定 | [本轮源码/测试/产物摘要](evidence/json-file-import-2026-11-16/build-sha256.json)，最终检查全部一致 |

纯模块验证文件扩展名/元信息与实际字节、UTF-8原文/BOM/CRLF/空内容/非法JSON不预解析、损坏UTF-8/UTF-16/过长编码/代理项拒绝、100000码元的中文及代理对边界。组件验证双方独立读取、取消/超时/重选/运行时错误、读取期间编辑、停止旧比较、迟到结果废弃、交换来源、IME、清空/pagehide/卸载，保持旧输入。

浏览器新增4项/引擎：375/768/1440真实系统选择事件及文件读取、中文/表情、原始大整数差1、单侧粘贴与双方导入、仅原文载入而不自动比较、交换/编辑来源、同名重选、编码/字节/码元错误、BOM/重复字段保留可修改、空文件与刷新清理，以及无内容外发/存储/第三方脚本；同时复验原051四项/引擎的精度、分页/报告、资源和IME。不是本轮全站回归，不复用052的38项冒充053验证。

## 首轮失败与限制

首次定向测试11通过、1失败，见[原日志](evidence/json-file-import-2026-11-16/targeted.log)。失败来自测试将textarea.value预期为CRLF，实际原生textarea显示/value按浏览器规则为LF；修正显示断言，并新增比较Worker接收的原文仍含CRLF的独立断言。没有为使测试通过而改写文件解码原文。最终413项通过。

已查看[Chromium 375px截图](evidence/json-file-import-2026-11-16/browser/artifacts/json-file-import-JFI-双侧文件、精度、混合编辑、键盘和隐私-375-chromium/json-file-375.png)，导入/来源/编辑及结果无横向溢出；三宽度两引擎均执行溢出检查。真实系统文件对话框、真实设备及读屏仍待负责人签收。

Firefox未执行本轮流程，沿用本日052最近一次启动失败（Could not find profile folder）的[探测记录](evidence/table-download-2026-11-16/firefox-probe.log)，本轮未再次重试或更改浏览器环境，不声明三引擎通过。

仅更新dist-ssg，可运行npm run preview:local查看；正式dist、依赖、远端和部署保持不变。
