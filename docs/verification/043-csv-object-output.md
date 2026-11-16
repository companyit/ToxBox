# 043 CSV 对象数组输出验证

日期：2026-11-15。负责人在具体范围确认问题后要求“继续往下优化”，按[规格](../specs/043-csv-object-output/spec.md)COBJ-01～07实施；正式打包、部署、上传和依赖新增不在本轮范围。

## 实现与需求对应

- COBJ-01～02：`csvJson.ts`新增可选`csvOutput`，默认二维字符串数组；对象模式显式首行作键，值全为字符串，不推断数字、日期、布尔或嵌套类型。
- COBJ-03：拒绝空白或换行规范化后重复的字段名；有效字段保留空白。使用无原型对象处理`__proto__`等字段，错误消息不回显输入；整数样式键遵循JSON序列化枚举规则，不保证字段文本顺序。
- COBJ-04～05：严格CSV状态机、矩形/Unicode/引号约束保留。对象模式允许表头加1000条记录，只有表头输出`[]`且可复制；原模式仍1000条总记录。输入100000码元、100列、输出1000000码元；提前计入重复键、转义和缩进，超限不返回部分结果。
- COBJ-06：新增有标签的模式选择及模式示例，输入/模式变化同步撤销结果、错误和复制反馈；IME期间禁用，清空/离页恢复默认，复制晚到反馈不得覆盖新状态。
- COBJ-07：同步页面元信息、指南和019现行范围。现有22工具、30HTML、22指南不变，没有新增路由、依赖、数据外发或持久化；未修改正式dist或部署。

## 验证

| 检查 | 本轮实际结果 |
| --- | --- |
| Vitest | 54文件401项通过；新增4项算法、2项组件测试，见[日志](evidence/csv-object-output-2026-11-15/vitest-final.log) |
| 静态页面 | 18文件20项通过，见[日志](evidence/csv-object-output-2026-11-15/ssg.log) |
| 历史身份 | 154项映射及负向夹具通过，见[日志](evidence/csv-object-output-2026-11-15/inventory.log) |
| 类型与preview构建 | 本轮E2E runner内执行通过，见[完整日志](evidence/csv-object-output-2026-11-15/e2e-final.log) |
| preview广告审计 | 30HTML、120页脚检查、22指南通过；preview无广告脚本，见[审计](evidence/csv-object-output-2026-11-15/preview-audit.json) |
| Chromium/WebKit | 586/586通过，各293项，无失败/跳过/重试；[本次运行](evidence/m106c3/runs/2026-11-14T23-43-44.140Z-7459/run.json)、[结果](evidence/m106c3/runs/2026-11-14T23-43-44.140Z-7459/results.json)、[源码/产物绑定](evidence/m106c3/runs/2026-11-14T23-43-44.140Z-7459/build-sha256.json)，构建/测试退出0且端口释放 |
| Firefox | 启动探测失败，见[外部探测日志](evidence/csv-object-output-2026-11-15/firefox-probe.log) |

算法测试包含输出恰好1000000码元接受、1000001拒绝，1000/1001条数据、100/101列、仅表头、空源、换行规范化后重复字段、原型字段及转义长度。组件覆盖错误恢复、模式切换撤销、样例、IME、仅表头可复制、复制晚到及pagehide清理。浏览器新增三宽度流程，验证字段映射、键盘焦点、错误不回显、空表头拒绝、仅表头及刷新清理。

本轮[源码摘要](evidence/csv-object-output-2026-11-15/source-sha256.json)包含算法、组件、元信息、指南和测试；package.json及锁文件与051摘要一致。未更新生产dist，无远端操作或部署。

首次沙箱内E2E启动因`listen EPERM 127.0.0.1:4177`失败，未运行用例；随后经自动审批允许在沙箱外启动本地服务重跑。Firefox先后在沙箱内和外探测仍无法启动，外部日志为`Could not find profile folder`，不声明三引擎通过，未安装/修改浏览器缓存。真实设备、读屏和系统剪贴板验收仍由负责人执行。

截图留存：[Chromium 375px](evidence/csv-object-output-2026-11-15/chromium-375.png)、[WebKit 375px](evidence/csv-object-output-2026-11-15/webkit-375.png)。已查看Chromium截图，模式、输入、结果和说明无横向溢出；不代替真实设备或读屏验收。构建后逐项核对全部src摘要仍一致。
