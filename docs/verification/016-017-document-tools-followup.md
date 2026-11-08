# 016/017 文档工具后续修复与验收

日期：2026-11-05。承接负责人“继续往下推动”，继续原 PDF-01～09、DOC-01～09 的实现质量与验证，不新增功能路线、依赖或部署范围。前轮记录见 [首次实现报告](016-017-document-tools.md)。

## 行为修复

1. DOCX 原检查会对 ZIP 解压量设限，但不核对 CRC32。先补三项复现测试，确认 STORE、DEFLATE 中央目录校验值损坏及仍为合法文本的正文损坏均错误接收，再实现受限解压流逐块 CRC32，结束后与原始中央目录比较；错误映射为既有固定中文消息，不生成预览。CRC32 用于发现文件损坏，不是数字签名或安全清洗。没有启用先整体解压再校验的库选项，原大小/解压/超时保护保留。
2. 打印等待字体/图片时清空或重选，异步失败可能覆盖“已清空”等新状态；打印调用触发 pagehide 后返回也可能回写旧提示。错误和返回分支均补版本核对，两项竞态回归通过。
3. 独立渲染发现 DOCX 打印页空白区域继承网站灰色背景。增加仅在文档打印根存在时生效的白底样式，并在双引擎打印媒体测试中验证背景。

实际文件：`src/utils/crc32.ts`、`src/utils/docxValidation.ts`、`src/views/pages/WordToPdfPage.vue`、`src/components/tools/DocxContent.vue`；新增 `tests/unit/docxIntegrity.test.ts`、`tests/unit/documentBoundaries.test.ts`，扩展生命周期及浏览器文档测试。离线视觉辅助为 `scripts/render-document-pdf.m`。规格设计和任务按原需求编号同步更新。

## 本轮实际检查

| 检查 | 结果 |
| --- | --- |
| 类型检查 | `npm run type-check` 通过 |
| 单元/组件 | `npm run test:vitest`：24 文件、211 项通过 |
| CSR 构建 | `npm run build:csr` 通过 |
| 完整类型与 SSG 构建、双引擎回归 | `node scripts/e2e-run.mjs chromium webkit`：296 项通过，源/测试/锁/产物摘要一致，预览端口释放 |
| SSG 校验 | 2 文件、3 项通过，17 HTML |
| 历史身份核验 | 154 项映射、原 SHA、唯一归属及负向夹具通过 |
| 广告准备检查 | 17 HTML、9 指南、68 页脚链接，广告关闭 |
| 补充边界 | 500 页 PDF 实际合并；10 文件/50 MiB 输入接收与相邻超限拒绝；1000 ZIP 条目接收/1001 拒绝；实际解压 50 MiB 接收/多一字节拒绝；DTD/实体、加密标志、伪主文档类型拒绝 |
| CRC32 | 标准向量 `123456789`、分块一致性、STORE/DEFLATE 正常与破损样例通过；浏览器真实 Worker 拒绝校验值损坏 DOCX，并使旧预览不可打印 |
| 格式与文档 | `git diff --check`、本轮文档相对链接检查通过 |

本轮没有更新 package/lock，不重复升级既有审计告警依赖。先前审计结果及范围仍见首次实现报告。

## 独立视觉证据

绕过前轮 Swift 模块编译问题，使用本机已有 clang 及 AppKit/PDFKit 编译离线辅助脚本，无系统或 npm 安装。可复现命令：

```sh
clang -fobjc-arc -framework AppKit -framework PDFKit scripts/render-document-pdf.m -o /private/tmp/toxbox-render-pdf
/private/tmp/toxbox-render-pdf /absolute/path/to/synthetic.pdf /private/tmp/rendered-page
```

对本轮浏览器下载/打印的合成文件逐页渲染：合并 PDF 三页顺序为 `300-1`、`200-1`、`200-2`，第三页旋转 90°，不同页宽正确；DOCX 打印三页中文段落从 1～70 连续，表格、蓝色 PNG、末尾内容可见，白底且无网站导航/工具表单。此结论仅覆盖这些合成样例，不推广为所有 PDF/DOCX 保真承诺，也不等于系统打印对话框人工另存通过。

证据：[本轮摘要](evidence/document-tools/followup-2026-11-05/summary.json)、[证据目录](evidence/document-tools/followup-2026-11-05/)、[浏览器运行记录](evidence/m106c3/runs/2026-11-05T13-24-08.903Z-5272/run.json)、[源/产物绑定](evidence/m106c3/runs/2026-11-05T13-24-08.903Z-5272/build-sha256.json)。证据目录包含修复前失败日志、修复后检查日志、六张逐页渲染图及输入 PDF/渲染文件摘要。

## 尚未完成

Firefox 已实际尝试默认临时目录及 `/private/tmp`，均在启动时报告 `Could not find profile folder.` 并退出，尚未执行页面验收；未重装或下载浏览器。记录见 [Firefox 启动结果](evidence/document-tools/followup-2026-11-05/firefox.json)。

真实手机、系统打印对话框人工另存、其他阅读器/字体/文档组合及所有保护上限的实际设备压力矩阵仍未完成；因此 016-T07、017-T08 保留部分未验收状态。负责人验收、新生产候选及部署未执行，不沿用旧包宣称已发布。

## 格式及打印按钮后续

本轮之后继续补充 DOCX 标题、两种列表、粗斜体、PNG/JPEG 和真实打印按钮检查，详见 [格式/打印报告](017-docx-format-print.md)。本报告原计数保留为当时记录，最新单元/组件为 212 项。
