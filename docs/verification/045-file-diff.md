# 045 文件对比验证

日期：2026-11-14（Asia/Shanghai）。基线HEAD `40aa4bf`，保留此前043～046文档及044实现变更。负责人在具体方案后要求“进行推动”，按[045规格](../specs/045-file-diff/spec.md)实现。046文件翻译按选择仍为方案，未接服务。

## 实现与变更

新增fileText.ts纯校验/解码模块、fileText.worker.ts独立读取Worker、FileDiffPage.vue。每侧严格UTF-8文本文件，支持TXT/MD/Markdown/CSV/JSON；开头BOM和换行规范化、1 MiB及100000码元/1000行保护；拒绝坏字节和指定控制字符。两侧只读预览，复用031算法/Worker及DiffTable展示双方行号、增删/保留、仅看变化及复制报告。文件名不进报告，文件不上传或保存。

每侧读取代次和对比/复制版本隔离，重选/错误撤销旧结果、其他侧保留；超时10秒、取消、交换和pagehide/卸载释放Worker/引用。同文件可重选。新页 `/office/file-diff/` 接入目录、搜索、办公导航/分类、指南、路由和敏感独立文档策略；noindex，无GA/广告。21工具（办公14/开发7）、29HTML、21指南；正式24页索引不扩大。必要清单/计数测试及广告准备配置同步，无依赖/锁/正式dist或部署变更。

## 首轮问题与修正

- 初轮Vitest出现新路由误入154历史身份枚举、目录20→21断言未更新，以及pages首项变化造成既有首页SEO假设失败。新路由使用独立newTest、同步明确数量、将新页面放回首页之后；原历史身份与源文件不修改。随后49文件369项通过。
- 初次preview构建暴露SSG仍要求27站点页，失败清理子进程又报EPERM。保留build-first.log；同步为28站点页/29HTML后，在允许本地端口及浏览器的环境重新构建。
- 首轮静态测试18通过、1失败，合成validators夹具仍生成27页；同步为28，保留原有重复路径/穿越/缺页负向断言。最终17文件19项通过。

## 已执行检查

| 检查 | 实际结果 |
| --- | --- |
| npm run test:vitest | 49文件369项通过；新增4项解码/边界、3项组件，另新路由1项；不把循环样本另计 |
| runner内npm run build:preview | 类型及客户端/服务端构建通过，生成29HTML；既有Vite未来configLoader导入扩展名提醒保留 |
| npm run test:ssg | 17文件19项通过，新增文件页空态/noindex/指南/脚本隔离检查 |
| npm run test:inventory | 154项历史身份/原文件SHA/唯一owner及负向夹具通过，不计新增功能测试 |
| node scripts/check-adsense-readiness.mjs | 29HTML、116页脚检查、21指南，广告仍关闭 |
| Firefox最小启动探测 | 退出1：Could not find profile folder，未进入功能测试；本轮不重装浏览器或把历史通过算本轮通过 |

## 限制

仅逐行纯文本，不是CSV单元格/JSON结构或Markdown版式对比；不支持Word/PDF/GBK/UTF-16、字符级差异或报告下载。真实设备/双稳定版本浏览器、读屏、系统文件选择及剪贴板需人工；Firefox功能验收待环境修复。本轮只更新preview/noindex，本地构建不等于正式移交或部署。文件翻译无可用入口、依赖、后端或上传。

## 浏览器首轮与补修

首次完整双引擎执行562项，507通过、55失败，整体退出1。[首轮记录](evidence/m106c3/runs/2026-11-14T03-39-05.589Z-5288/run.json)及[结果](evidence/m106c3/runs/2026-11-14T03-39-05.589Z-5288/results.json)保留。52项为目录/图标/工具列表测试仍预期20工具、办公13项或旧顺序；将明确数量更新为21/14并补入文件对比，保留布局、焦点、搜索及后续断言。另3项为新增文件页WebKit从普通页整页导航时，hydrated helper过早调用导致上下文销毁；新增流程显式等待目标URL导航后再执行原hydration检查，不修改公共helper或业务导航。没有把这轮记录为通过。

实际查看Chromium375px和1440px结果截图，预览、差异行、双方行号和报告可见，无页面横向溢出；[375px](evidence/file-diff-2026-11-14/result-375.png)、[1440px](evidence/file-diff-2026-11-14/result-1440.png)。截图来自本轮preview服务器与合成三行文件，不代签真实设备或系统文件选择。

## 最终验收结果

修正测试接入后，当前源重新类型检查/preview构建，Chromium/WebKit全站 **562/562通过**（各281项），无失败/跳过/重试，整体退出0；新增文件流程两引擎各375/768/1440共6项通过。runner核对源/测试/夹具/配置/锁/产物摘要未变化、端口释放。[最终记录](evidence/m106c3/runs/2026-11-14T03-47-30.223Z-7003/run.json)、[结果明细](evidence/m106c3/runs/2026-11-14T03-47-30.223Z-7003/results.json)、[源码/产物绑定](evidence/m106c3/runs/2026-11-14T03-47-30.223Z-7003/build-sha256.json)、[完整日志](evidence/file-diff-2026-11-14/e2e-corrected.log)。

额外补验Chromium/WebKit在375px、200%字号无页面横向溢出，焦点到开始按钮后Enter对比、Space切换仅变化均通过，见[补验输出](evidence/file-diff-2026-11-14/zoom-keyboard-final.log)。首次补验脚本未等待读取结束就在禁用按钮尝试Enter，导致等待结果超时；增加等待按钮启用后通过，未改业务代码，保留[首次输出](evidence/file-diff-2026-11-14/zoom-keyboard.log)。

[Firefox探测](evidence/file-diff-2026-11-14/firefox-probe.log)仍失败，不宣称三引擎通过。[静态复验](evidence/file-diff-2026-11-14/ssg-final.log)、[广告准备审计](evidence/file-diff-2026-11-14/adsense-readiness.log)通过。负责人和真实系统操作签收仍待完成。
