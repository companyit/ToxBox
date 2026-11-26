# 054 JSON结构对比定位与跳转验证

日期：2026-11-16。负责人明确要求新增定位与跳转，按[054规格](../specs/054-json-diff-navigation/spec.md)JDN-01～06在当前JSON结构对比结果区实现，不扩大到其他对比工具或部署。

## 修改与行为

- `src/utils/jsonDiffNavigation.ts`提供纯路径匹配，按JSON Pointer原文字面子串、区分大小写、不trim或解码，不解释正则；空查询包括当前类型筛选全部差异及根空指针，稳定返回原索引。
- `JsonDiffPage.vue`增加路径查找、定位首处/上一处/下一处及匹配状态。边界不循环、无匹配禁用；定位自动切换100项分页、高亮唯一当前项，aria-current/tabindex=-1聚焦并滚动到视口。选择器仅使用内部数值索引，不拼接用户字段路径。
- 查询、类型筛选、手动翻页撤销定位；新输入/比较/导入/交换/清空/离页清除查找及定位。独立导航版本阻止nextTick迟到焦点；查找IME只暂停提交/定位，组合Enter不preventDefault干扰候选提交，结束后再提交查询，不撤销JSON结果。
- 查找仅定位，不过滤原列表，不改变统计、分页或报告范围。原结构算法、精度、类型筛选、完整报告/复制、文件导入与052下载保持。指南与产品文档同步。

## 本轮验证

| 检查 | 实际结果与证据 |
| --- | --- |
| 单元/组件 | 56文件420项通过；新增2项纯匹配、5项组件，见[日志](evidence/json-diff-navigation-2026-11-16/vitest.log) |
| 定向首次检查 | 2文件16项通过，类型检查通过，[日志](evidence/json-diff-navigation-2026-11-16/targeted.log) |
| 类型/preview构建 | 通过，30HTML，见[日志](evidence/json-diff-navigation-2026-11-16/build.log) |
| 静态 | 18文件20项通过，[日志](evidence/json-diff-navigation-2026-11-16/ssg.log) |
| 历史身份 | 154项及负向夹具通过，[日志](evidence/json-diff-navigation-2026-11-16/inventory.log) |
| Chromium/WebKit | 24/24通过，各12项，无失败/跳过/重试；[日志](evidence/json-diff-navigation-2026-11-16/browser.log)、[结构化结果](evidence/json-diff-navigation-2026-11-16/browser/results.json) |
| preview审计 | 30HTML、120页脚、22指南通过、无广告加载器，[结果](evidence/json-diff-navigation-2026-11-16/preview-audit.json) |
| 绑定 | [本轮源码/用例/产物及正式dist/依赖快照](evidence/json-diff-navigation-2026-11-16/build-sha256.json) |

单元覆盖根空指针、稳定索引、大小写/空白、~0/~1、正则样式/HTML字面量。组件覆盖205项结果中/10匹配11处、10到100跨页往返、唯一高亮/焦点、首尾/零匹配、类型组合、手动翻页、报告仍含/204、IME提交/候选Enter不被拦截、编辑与离页废弃迟到定位。

浏览器新增4项/引擎，合并既有结构比较4项及文件导入4项/引擎执行：375/768/1440、跨页10→100及/204第三页定位，焦点与目标完整位于视口、报告仍含/0和/204、统计保持205项，零匹配保留列表、类型筛选与清空查询、字面/转义/大小写及根节点、IME候选提交、200%字号重排、无外发/存储/GA/广告。不是全站复验，不复用之前其他模块的浏览器通过数量。本轮无测试失败。

已查看[Chromium375截图](evidence/json-diff-navigation-2026-11-16/browser/artifacts/json-diff-navigation-JDN-跨页路径定位、焦点可见、报告范围与隐私-375-chromium/json-navigation-375.png)，目标/204在第三页有唯一高亮和焦点，查找和导航控件可换行；三宽度两引擎无页面横向溢出。[WebKit375截图](evidence/json-diff-navigation-2026-11-16/browser/artifacts/json-diff-navigation-JDN-跨页路径定位、焦点可见、报告范围与隐私-375-webkit/json-navigation-375.png)同时保留。

## 范围与未完成

22工具/30HTML/22指南、索引及广告范围不变，无新依赖/路由/服务/持久化。052下载及053导入的既有未提交改动保留。正式dist、依赖与053快照一致，仅更新dist-ssg，使用npm run preview:local查看，未部署。

Firefox未执行本轮流程，沿用本日最近一次[052启动探测](evidence/table-download-2026-11-16/firefox-probe.log)的profile错误，未重复重试或修改环境；不声明三引擎通过。真实设备、读屏和负责人交互签收保留待验。
