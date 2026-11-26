# 052 转换结果下载验证

日期：2026-11-16。负责人接受下载优先项后，按[052规格](../specs/052-table-result-download/spec.md)TDL-01～06实现CSV/JSON页结果下载；不包含JSON文件导入、差异定位、翻译或部署。

## 行为与修改范围

CsvJsonPage新增独立转换成功状态和“下载 JSON/CSV”按钮，下载固定文件名converted.json/converted.csv。只有成功结果可以下载，空CSV也有效；IME、编辑、换向、所有转换选项变化使结果和下载同步失效。保留原转换算法、精度、默认模式、资源预算、复制和示例保护。

用户点击后才创建本地Blob和对象URL，缓存当前结果URL，重复下载复用。修改、重算、清空、pagehide和卸载回收；临时链接finally移除。下载失败给固定提示、回收URL并保留输入/结果可重试，不暴露浏览器异常。只表示已请求浏览器下载，不声称系统已保存。

UTF-8编码、无额外BOM或换行，实际下载字节应等于结果框UTF-8编码；CSV公式文字、中文、表情、前导零及原数字词元不改写。页面说明“不上传或自动保存”，明确用户主动下载由浏览器处理。

修改页面、工具指南、组件测试及新增浏览器用例，配套052规格/设计/任务和产品进度。无依赖/配置/路由/纯转换算法变更，22工具/30HTML/22指南、索引和广告边界不变。

## 实际验证

首轮405项单元/组件、20项静态、154项历史身份及Chromium/WebKit38项定向回归均通过。首轮日志保留，最后仅校正“不上传或自动保存”说明后重构建并复验，最终结果如下：

| 检查 | 本轮最终结果 |
| --- | --- |
| 单元/组件 | 54文件405项通过，[日志](evidence/table-download-2026-11-16/vitest-final.log) |
| 类型与preview构建 | 通过，30HTML，[日志](evidence/table-download-2026-11-16/build-final.log) |
| 静态 | 18文件20项通过，[日志](evidence/table-download-2026-11-16/ssg-final.log) |
| 历史身份 | 154项及负向夹具通过，[日志](evidence/table-download-2026-11-16/inventory.log) |
| Chromium/WebKit | 38/38通过，各19项，无失败/跳过/重试；[日志](evidence/table-download-2026-11-16/browser-final.log)、[结构化结果](evidence/table-download-2026-11-16/browser-final/results.json) |
| preview审计 | 30HTML/120页脚/22指南通过，无广告加载器，[结果](evidence/table-download-2026-11-16/preview-audit-final.json) |
| 范围与绑定 | [最终源码/用例/产物摘要](evidence/table-download-2026-11-16/build-sha256-final.json)，正式dist与依赖对照首轮快照一致 |

证据目录：[本轮记录](evidence/table-download-2026-11-16/)。

组件新增3项测试（每项包含多个行为样本），覆盖下载资格、零字节CSV、JSON/CSV文件名/MIME、UTF-8正文、按需生成、重复复用、全部选项/编辑/重算/清空/pagehide/卸载回收、创建和触发失败重试、异常不外泄及IME保护。

浏览器新增4项/引擎，与既有CSV页15项/引擎合并定向运行：375/768/1440三宽度，真实下载的文件名和逐字节内容核对，默认二维/对象数组/只有表头/JSON转CSV/空CSV、中文表情/引号换行/精确大整数；百万码元结果完整下载、重复下载、键盘Enter、IME与离页清理。辅助检测器检查外部请求、运行时错误及hydration。

Firefox本轮启动探测仍失败（Could not find profile folder），见[日志](evidence/table-download-2026-11-16/firefox-probe.log)，未安装或修改浏览器环境，不声明三引擎通过。真实设备、读屏与系统文件保存界面仍待负责人签收；自动化仅验证浏览器下载文件，不能代替用户磁盘保存。

本轮只更新dist-ssg，运行npm run preview:local查看。未更新正式dist或部署，不将前轮全站586项作为本轮重跑结果。

截图：[Chromium 375px](evidence/table-download-2026-11-16/chromium-375-final.png)、[WebKit 375px](evidence/table-download-2026-11-16/webkit-375-final.png)。首轮Chromium截图已查看，下载与复制并列、说明换行正常；最终两引擎三宽度均通过横向溢出检查。本轮没有行为测试失败；最终版本重跑因说明文案校正，首轮记录未覆盖。
