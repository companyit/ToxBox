# 017 DOCX 格式与真实打印按钮补验

日期：2026-11-05。承接负责人“继续推动”，本轮继续 DOC-03/06/07/09，不新增依赖、工具页面、上传路线或发布范围。前轮记录见 [后续修复报告](016-017-document-tools-followup.md)。

## 修改与行为

- `tests/helpers/documentFixtures.ts`：共用合成 DOCX，包含合法样式表/编号定义/关系，语义一级标题、十进制列表、项目列表、加粗、斜体、简单表格、PNG 和真正的 JPEG，以及 70 段中文/英文正文。图片均为自制蓝色图块，无用户资料。JPEG 预先由本机 sips 从合成 PNG 生成后固化为测试数据，运行测试不依赖 sips。
- `tests/unit/docxConversion.test.ts` 与 `e2e/document-tools.spec.ts`：直接导入共用夹具，删除截取 e2e 源并通过 `new Function` 执行的复用方式。检查各语义结构进入实际转换结果及浏览器安全预览，两种图片均通过实际解码后才允许请求打印。
- `src/views/pages/WordToPdfPage.vue`：打印 API 返回后改为“已请求打印”，不再由 API 返回推断系统对话框已经结束。原清空、重选、离页版本保护保留；不显示保存成功。
- `tests/components/documentLifecycle.test.ts`：补充 API 正常返回时的提示边界回归。
- `scripts/e2e-run.mjs`：把共用 `tests/helpers` 夹具加入运行前后摘要及 `build-sha256.json`，防止只绑定 e2e 入口而遗漏真正被使用的输入。

## 本轮验证

| 检查 | 实际结果 |
| --- | --- |
| `npm run type-check` | 应用及测试类型通过 |
| `npm run test:vitest` | 24 文件、212 项通过 |
| `npm run build:csr` | 通过 |
| 双引擎浏览器验收 | `node scripts/e2e-run.mjs chromium webkit` 完整构建与 296 项回归通过，包含 375/768/1440px 新格式预览、真实打印按钮和损坏文件拒绝 |
| `npm run test:ssg` | 2 文件、3 项通过 |
| `npm run test:inventory` | 154 项历史身份及负向夹具通过 |
| 广告准备检查 | 17 HTML、9 指南、68 页脚链接，广告关闭 |
| 文档/格式 | 相对链接及 `git diff --check` 通过 |

首轮格式回归通过后，因共用夹具移出 e2e 目录，补齐运行器对 `tests/helpers` 的摘要绑定，再执行一次最终双引擎验收。没有重试或跳过失败用例。第二次运行的源、入口测试、共用夹具、配置、锁和 SSG 输出摘要均校验一致，预览端口释放。

## 实际打印调用与视觉检查

浏览器测试没有替换 `window.print`：在安全预览完成后点击实际“打印 / 另存为 PDF”按钮，记录浏览器打印事件，随后确认重选损坏文件使旧正文不可打印。

- Chromium 三个宽度均记录到 `beforeprint` 和 `afterprint`。
- WebKit 三个宽度均执行按钮流程并返回“已请求打印”，当前无头环境未记录到打印事件。因此不将 WebKit 结果写成原生打印对话框已打开或保存完成。
- Chromium 实际生成三页 PDF，由独立 PDFKit 逐页渲染目视检查：标题层级、两种列表标记、粗斜体、表格、PNG/JPEG 两张图片均可见，70 段正文在三页间连续，无工具表单、网站导航或文件名，白底正常。

这些结果验证了按钮路径及合成样例内容，仍不等于有人在系统打印对话框里选择路径并保存成功。

最终记录：[运行摘要](evidence/m106c3/runs/2026-11-05T13-34-17.417Z-6701/run.json)、[源与共用夹具摘要](evidence/m106c3/runs/2026-11-05T13-34-17.417Z-6701/build-sha256.json)、[本轮证据目录](evidence/document-tools/format-print-2026-11-05/)。目录包含命令日志、打印事件、三张独立渲染图及 PDF/源摘要。

## 保留事项

未改变 package/lock；未重装 Firefox，其上一轮配置目录启动失败仍未解决。本轮未执行真实设备、系统打印人工保存、更多 Word/字体/阅读器组合或全设备压力矩阵。017-T08 继续保留部分未验收；本轮没有生产候选、部署或扩大八页正式索引白名单。下一功能模块的优先级待负责人选择，不把未回复的建议视为实现授权。
