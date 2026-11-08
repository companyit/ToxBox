# 016/017 本地文档工具实现与验证

日期：2026-11-05。范围：PDF-01～09、DOC-01～09。负责人在审阅现有规格、精确依赖及 package/lock 更新请求后要求“继续推动”，本轮据此实施；不包含新生产候选、打包、Git 写操作、远端设置或部署。保留开始时已有工作区修改。

## 实际行为与文件

- `/office/pdf-merge/`：本地选择/原子追加、文件大小/数量/页数校验、键盘上移下移与删除、同源 Worker 合并、30 秒保护、取消、固定名称下载和清空。拒绝损坏、加密及存在 AcroForm 的文档；不承诺签名、书签、附件和结构保真，不嵌入 PDF。
- `/office/word-to-pdf/`：仅普通 DOCX；Worker 内检查原始 ZIP 中央目录及本地文件头、重复/穿越/加密/宏/符号链接、实际流式解压量、XML 声明、主文档类型；转换后以白名单模型显示文字、简单表格和 PNG/JPEG。外链仅保留文字。用户通过浏览器系统打印另存 PDF，不承诺 Word 原版式。
- 新增 `src/utils/pdfLimits.ts`、`pdfMerge.ts`、`docxLimits.ts`、`docxValidation.ts`、`docxPreview.ts`、`sensitivePages.ts`，两个 `src/workers/*.worker.ts`，两工具页面及 `DocxContent.vue`；接入页面/工具/指南数据、现有路由、首页、办公导航、隐私说明和广告准备配置。业务算法未放入 App.vue。
- PDF/DOCX 与原 2FA 共用敏感文档组，跨组整页导航；正式 origin 下也不初始化 GA。文件和预览不持久化、不上传，不加载广告。库诊断在独立 Worker 中关闭，错误使用固定中文，不暴露内容或内部栈。
- 取消/超时终止 Worker；编辑列表、重选、清空、pagehide、卸载使旧任务失效并撤销结果 URL。DOCX 打印根只含同一安全正文模型，不含网站导航、原文件名和工具表单。
- 共 9 工具、16 站点页面加 404。精确更新 SSG、浏览器运行器及数量断言；新页 noindex，原八页正式索引白名单不扩大。Worker 是同源 hash JS，已由 Vite SSR manifest 列出，沿用既有资源验证，不放宽白名单。

## 依赖与许可

通过注册表实际核验并以 `--save-exact --ignore-scripts` 安装 `pdf-lib@1.17.1`、`mammoth@1.13.0`、`jszip@3.10.1`。锁文件新增 28 项，原有包条目零变化；没有升级无关依赖。三项直接依赖及递归依赖的许可通知加入 `public/third-party-notices.txt`；JSZip 采用 MIT 选项。

安装后 `npm audit` 返回非零，告警为 7 中危、1 高危，来自已有 Vitest/mocker、test-utils/beautifier/glob/minimatch 与 jsdom/undici 依赖链。新增文档依赖未列入本次告警；这不构成完整安全证明。未运行 audit fix 或升级现有测试工具。原始审计及锁变更记录见 [audit.json](evidence/document-tools/audit.json)、[dependency-review.json](evidence/document-tools/dependency-review.json)。

Mammoth 1.13 的图片方法类型声明与实际 ZIP 返回值不同：实际可能为 Uint8Array。已统一复制为 ArrayBuffer 后校验签名/像素，并用合成 PNG 回归。

## 实际验证

| 检查 | 本轮结果 |
| --- | --- |
| `npm run type-check` | 通过，应用及测试类型检查 |
| `npm run test:vitest` | 22 文件，201 项通过 |
| `npm run build:csr` | 通过 |
| `node scripts/e2e-run.mjs chromium webkit` | 自带完整类型/SSG 构建通过；两引擎 296 项通过；源、测试、配置、锁和产物摘要未漂移，本地端口已释放 |
| `npm run test:ssg` | 2 文件、3 项通过，17 HTML 与许可通知一致 |
| `npm run test:inventory` | 原 154 项身份、源 SHA、唯一归属及负向夹具通过 |
| `node scripts/check-adsense-readiness.mjs` | 17 HTML、68 页脚链接、9 使用指南，广告仍关闭 |
| `git diff --check` | 通过 |

新增测试覆盖 PDF 合并后重新解析页序/尺寸/旋转与重复文件，文件/总量/页数/表单/损坏拒绝，DOCX 原始目录与流式解压超限、宏/穿越/重复/缺失结构、PNG 签名/像素、白名单主动内容拒绝、超深/超长预览、取消/超时/迟到消息、清空/离页释放及正式 origin 下不初始化统计。

双引擎在 375/768/1440px 实测真实 Worker、文件选择、键盘重排、下载及解析、无页面横向溢出、DOCX 中文/简单表格/内嵌可见图片、外链文字、清空、打印样式正文隔离和双向整页边界。Chromium 实际生成多页打印 PDF；用系统 PDF 渲染检查首屏中文、表格和蓝色 PNG 可见、无站点导航。自动化打印产物不等于用户在系统对话框中完成保存。

最终浏览器证据：[run.json](evidence/m106c3/runs/2026-11-05T12-51-16.820Z-4190/run.json)、[build-sha256.json](evidence/m106c3/runs/2026-11-05T12-51-16.820Z-4190/build-sha256.json)、[results.json](evidence/m106c3/runs/2026-11-05T12-51-16.820Z-4190/results.json)。截图、合并 PDF 和打印 PDF 在该目录的 artifacts 内。命令日志及摘要见 [证据目录](evidence/document-tools/)。

此前失败记录保留：首次普通沙箱无法监听本地端口；首次 Chromium 回归暴露图片字节类型差异及旧定位/布局假设；随后双引擎 295/296，WebKit 在整页跳转期间执行 hydration 检查导致上下文销毁。改为等待目标文档加载后检查，最终 296/296。没有以重试或跳过断言掩盖失败。

## 验证边界与未完成

- 本轮未执行 Firefox、真实手机、系统打印对话框人工另存及多阅读器完整视觉矩阵。补充的 Swift/PDFKit 全页渲染尝试因本机 SwiftBridging 模块重复定义失败，未作为通过证据；系统 sips 首屏渲染已用于 DOCX 目视检查，合并 PDF 仍需补充完整视觉对照。T07（016）/T08（017）保留未勾选，不能宣称完整人工验收结束。
- PDF 产品上限与 DOCX 资源限额是保护值，不是所有设备的性能保证；没有完成各最大规模/畸形文件组合的压力测试。Worker 终止不承诺物理内存擦除或设备绝不耗尽内存。
- 未实现 DOC、复杂 Word 版式、高保真转换、云保存、后端或上传。未做新生产候选、部署和正式域名接收验证。
- 既有构建提示部分 TS 导入缺扩展名可能不适配未来 native config loader；本轮构建通过，未扩大范围修改。

## 2026-11-05 后续记录

CRC32 损坏拒绝、打印竞态和白底修复，以及独立 PDFKit 逐页渲染、资源边界及 Firefox 启动尝试见 [后续报告](016-017-document-tools-followup.md)。本报告原有计数和限制保留为首次实现时点记录；本轮 211 项单元/组件及双引擎 296 项回归通过，尚未部署。
