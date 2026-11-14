# 041 Firefox 原生打印补验

日期：2026-11-13（Asia/Shanghai）。负责人要求继续往下开发，本轮按 [041 规格](../specs/041-native-print/spec.md) PRINT-01～06 推进 040 遗留的原生打印自动化限制，并补充实际纸张选择说明。

## 范围与基线

HEAD 为 `9e16e2a6d9f6a5ad953db6e692e00f5f1937de71`；开始时已有 040 工作区改动，全部保留。[开始时的源码/测试/锁/配置摘要](evidence/native-print-2026-11-13/starting-bindings.json) 绑定本轮实际起点，不把 040 改动计作本轮新增。

本轮实际环境：macOS 26.4、arm64、Node v24.21.0，独立读取使用当前系统 PDFKit；不沿用历史验收中的操作系统版本。

本轮实现仅涉及：

- `e2e/document-tools.spec.ts`：临时测试 profile 的 Firefox 虚拟 PDF 打印设置、新文件门槛、完整 PDF 结束标记、多页及 A4 逐页尺寸检查，保留实际网站按钮调用、beforeprint/afterprint、错误/清空及隐私断言。
- `src/views/pages/WordToPdfPage.vue`：现有说明增加 A4、纵向及保存前核对纸张设置的提醒；不修改打印调用、转换算法或用户浏览器设置。
- 产品/041 规范、进度和本轮证据。无新工具、依赖、路由、广告、上传或持久化，不更新正式 dist/移交包，不执行 Git 写操作、远端操作或部署。

## 实际探测和首轮结果

1. 原生两页探测在沙箱内启动 Firefox 时 SIGABRT；获准启动隔离浏览器后成功。Firefox 157.0 原生 window.print 输出 33,297 字节两页 PDF，保留 [失败探测](evidence/native-print-2026-11-13/probe-qn1mQ4/probe.json)、[成功探测](evidence/native-print-2026-11-13/probe-RItVQe/probe.json)、对应 PDF 及源码。没有替换 window.print、安装浏览器或调用实体打印机。
2. 首轮三引擎全站 **810 项通过**，三个 Firefox 实际 DOCX PDF 均生成新文件，打印前文件不存在、完整结束标记、多页解析和真实打印事件检查通过。原始 [run.json](evidence/m106c3/runs/2026-11-13T14-02-28.390Z-10119/run.json)、[浏览器明细](evidence/m106c3/runs/2026-11-13T14-02-28.390Z-10119/results.json) 保留。
3. 系统 PDFKit 独立读取发现临时 profile 默认纸张为 **Letter（612×792pt）**，A4 断言失败；不能据首轮绿色结果宣称纸张符合规格。[首次独立检查日志](evidence/native-print-2026-11-13/pdfkit.txt) 和 [三份 Letter 原生输出及原始文本](evidence/native-print-2026-11-13/first-native/) 保留。
4. 新临时 profile 显式选择毫米单位、210×297mm、iso_a4 后，原生两页探测输出经 PDFKit 实测为 595×842pt；[A4 探测](evidence/native-print-2026-11-13/probe-iShTw8/probe.json)、[独立尺寸记录](evidence/native-print-2026-11-13/probe-a4-pdfkit.json) 保留。随后接入 A4 偏好和逐页断言，补页面纸张选择说明，重新执行全站。

原生打印设置的核对依据为 Mozilla 的 [原生静默打印记录](https://bugzilla.mozilla.org/show_bug.cgi?id=1741698) 和 [纸张偏好记录](https://bugzilla.mozilla.org/show_bug.cgi?id=1673012)，实际可用性以本轮文件结果为准。所有偏好仅传入该 spec 的临时测试浏览器，文件输出在独立 run 目录，测试完成后各用例文件移入独立 artifacts 目录；其他浏览器保留原有打印调用和 Chromium PDF 对照。

## 最终验证

| 检查 | 实际结果 |
| --- | --- |
| 最终 runner 内类型检查及新 preview/noindex 构建 | 退出 0，最终源/测试/夹具/配置/锁/产物摘要复核一致，端口释放 |
| `npm run test:vitest` | 46 文件、332 项通过，退出 0 |
| `npm run test:ssg` | 16 文件、18 项通过，退出 0 |
| A4 补修后 `node scripts/e2e-run.mjs chromium firefox webkit` | 810/810 全部通过，三引擎各 270 项；失败/跳过/重试均为 0，构建和测试退出 0 |
| 独立 PDFKit 文本、尺寸和渲染 | 6 份 PDF、18 页通过；三份 Firefox 原生文件与三份 Chromium 对照均为多页 A4，合成正文完整，未发现工具界面/文件名等排除文本 |

最终运行目录：`evidence/m106c3/runs/2026-11-13T14-11-13.112Z-11596/`。源、测试、夹具、配置、锁和产物摘要由现有 runner 生成及复核，完整 HTML、trace、下载和截图保留于该目录；本轮另归档精简摘要及实际 PDF。

最终 [run.json](evidence/m106c3/runs/2026-11-13T14-11-13.112Z-11596/run.json)、[浏览器明细](evidence/m106c3/runs/2026-11-13T14-11-13.112Z-11596/results.json)、[源/产物摘要副本](evidence/native-print-2026-11-13/final-build-sha256.json) 和 [本轮汇总](evidence/native-print-2026-11-13/summary.json) 均已归档。实际版本为 Chromium 156.0.8078.4、Firefox 157.0、WebKit 27.2；三个 Firefox 原生打印用例均触发 beforeprint/afterprint 并生成各自新的三页 A4 PDF。相比 041 起点，源码只改 WordToPdfPage.vue，e2e 只改 document-tools.spec.ts，配置/锁和 040 其余源/测试摘要保持。

独立文本检查保留 PDFKit 原始文本，并使用 NFKC 处理字体提取中的兼容部首。首次探测逐码元断言“第二页”失败，实际提取为“第⼆页”；[原始文本](evidence/native-print-2026-11-13/probe-pdfkit.json) 和 [首次失败说明](evidence/native-print-2026-11-13/probe-pdfkit-first-check.txt) 均保留。此归一化不改变 PDF，不用文本检查替代实际渲染。

最终独立结果见 [checks.json](evidence/native-print-2026-11-13/pdfkit-final/checks.json)、[实际输出归档及 SHA256](evidence/native-print-2026-11-13/pdfkit-final/archived.json) 和 [复核日志](evidence/native-print-2026-11-13/pdfkit-final.txt)。每份三页：Firefox 实测 595×842pt，Chromium 约 594.96×841.92pt，均在 A4 的 1pt 尺寸容差内。标题、两种列表、粗斜体文字、表格两格及第 70 段均通过文本检查；六份文件全部由系统阅读器重新渲染。

已实际查看 [Firefox 原生首屏渲染](evidence/native-print-2026-11-13/pdfkit-final/document-1-1.png) 与 [Chromium 对照渲染](evidence/native-print-2026-11-13/pdfkit-final/document-4-1.png)，标题、编号/无序列表、表格、两张图片和正文可见，页面没有网站导航或真实文件名。这是本轮合成文档证据，不代表任意 DOCX 字体或版式保证。

复查工具和步骤见 [证据说明](evidence/native-print-2026-11-13/README.md)。系统阅读器将六份文件全部渲染为 18 张 PNG；只有上述两张进行了本轮实际视觉查看，不将其余页自动渲染冒充逐页人工审阅。

交付前 `git diff --check`、041 规格/报告/证据说明的相对链接、完整最终源/测试/夹具/配置/锁/产物摘要及六份 PDF 归档摘要检查通过；[sha256.json](evidence/native-print-2026-11-13/sha256.json) 绑定本轮59个证据文件，排除自身。未重跑依赖审计或远端 CI，不据历史结果推断其当前状态。

## 保留的验收边界

本轮证明的是临时测试浏览器通过原生打印输出 PDF 的能力；不代表负责人在真实 Firefox 对话框选择设置、取消或保存已经验收。017 T08/T09、040 T06/T07 和 20 工具人工清单不由自动化代签。

真实手机/软键盘、实际读屏、系统剪贴板及保存、其他浏览器/系统版本、更广 DOCX 字体与排版矩阵仍待实际验收。生产域名/托管 HTTP/MIME/缓存、线上性能、远端 CI/分支保护及正式发布未在本轮核验。040 的 807 通过/3 失败记录保持原样，本轮新证据不追认旧运行通过。
