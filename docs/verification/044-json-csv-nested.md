# 044 JSON 转 CSV 嵌套记录验证

日期：2026-11-14（Asia/Shanghai）。基线HEAD `40aa4bf`，保留此前043文档提案。本轮按负责人样例及继续优化授权实施 [044规格](../specs/044-json-csv-nested/spec.md)，043反向模式未实现。

## 行为与文件

- `src/utils/jsonTable.ts`：增加可选对象展开和root/each路径作用域，沿用Map及原始数值词元；数组不拆行，空对象为{}、null为null，缺字段补空；点和反斜杠字段段转义，规范化冲突拒绝。保留100列并集及现有深度/节点/输入输出/记录限额。
- `src/views/pages/CsvJsonPage.vue`：两个显式选项、完整接口数组示例、说明；新状态纳入同步结果失效、复制版本保护、IME禁用及离页重置。默认仍保留JSON文本、从根选择。
- `src/data/toolGuides.ts`、019说明、产品需求与ADR-038补充同步；算法、组件及三宽度浏览器流程新增。未改依赖、锁、路由、统计、广告、正式dist或部署。

## 已执行

| 检查 | 结果 |
| --- | --- |
| 针对性首轮 | 46通过、1失败；失败为反斜杠转义测试预期多写一倍，按规格修正测试字面量，算法未修改 |
| npm run test:vitest | 47文件、361项全部通过；相对042新增4项算法及1项组件 |
| npm run build:preview | 类型及客户端/服务端SSG构建退出0，28 HTML；保留既有Vite未来configLoader导入扩展名提示 |
| npm run test:ssg | 16文件、18项通过 |
| npm run test:inventory | 154项历史身份/原文件SHA/唯一owner及负向夹具核对通过，不计新增业务测试 |
| 三引擎runner首轮 | 沙箱端口监听EPERM，未启动测试；保留日志 |

允许启动本地端口及浏览器后执行完整三引擎runner，结果另见下文。Firefox默认临时profile启动失败，错误为Could not find profile folder；另设仓库`.ci/browser-tmp`最小启动探测仍失败，不修改或重装浏览器缓存。启动失败不等于功能断言失败，也不能算功能通过。

## 限制

不解码HTML实体或删除JSON行末反斜杠。each模式仅支持根对象数组逐条选中对象；不跳过坏记录、不猜测字段、不展开数组成多行。CSV不保留类型。真实设备、读屏、中文输入法及系统剪贴板仍待人工；本轮未执行正式打包、远端CI/托管或发布。

## 最终浏览器结果

三引擎完整执行828项：Chromium 276/276、WebKit 276/276通过；Firefox 276项均因浏览器profile启动失败，未完成功能检查；整体退出1，无跳过或重试。新增NCSV三宽度每引擎3项，Chromium/WebKit合计6项通过，Firefox3项未能验收。未把首次启动失败或历史819通过替换成本轮通过。

[runner记录](evidence/m106c3/runs/2026-11-14T03-21-26.067Z-3120/run.json)、[结果明细](evidence/m106c3/runs/2026-11-14T03-21-26.067Z-3120/results.json)、[源与产物绑定](evidence/m106c3/runs/2026-11-14T03-21-26.067Z-3120/build-sha256.json)、[完整输出](evidence/json-csv-nested-2026-11-14/e2e-allowed.log)。runner结束核对源/测试/配置/锁/产物未变化且端口释放。没有额外视觉截图人工签收。
