# 041 原生打印证据

本轮环境：macOS26.4 arm64、Node24.21.0；详见 [041报告](../../041-native-print.md)。既有040源码/测试改动完整保留，本轮只新增文档工具测试的隔离打印设置和页面纸张选择说明。

- `probe.mjs`、`probe-a4.mjs` 和三个 `probe-*/`：首次沙箱启动失败、原生两页打印成功及A4补修探测源码/记录/实际PDF。偏好仅用于临时测试实例。
- `e2e.txt`：首轮810项通过的原始日志；但该轮默认Letter，独立A4检查失败，不能视为全部交付通过。
- `pdfkit.txt`、`first-native/`：首轮A4失败及三份实际Letter文件/原始提取文本；未覆盖。
- `e2e-final.txt`、`summary.json`、`final-build-sha256.json`：最终A4补修后三引擎810项通过，各引擎270项，无失败/跳过/重试；源/测试/夹具/配置/锁/preview产物摘要一致。`first-build-sha256.json`保留首轮绑定。
- `vitest.txt`、`ssg-final.txt`：最终332项单元/组件、18项静态检查通过。
- `final-documents/`、`pdfkit-final/checks.json`、`pdfkit-final/archived.json`：三份Firefox原生PDF及三份Chromium对照，各三页，共18页，记录原始文本、NFKC语义检查、A4尺寸、排除文本及归档SHA256。
- `pdfkit-final/*.png`：系统PDFKit对18页的实际重新渲染；本轮只实际查看document-1-1和document-4-1两张，不将其他页自动渲染称为人工视觉签收。
- `probe-pdfkit-first-check.txt`：首次逐码元文本断言失败及兼容部首说明；原始文本在`probe-pdfkit.json`，归一化不修改PDF。
- `starting-bindings.json`：041起点已含040工作区改动。最终相比起点仅WordToPdfPage.vue及document-tools.spec.ts变化，依赖声明/锁及根测试配置不变。

完整浏览器results.json、HTML、trace、截图和下载仍保留在本地被忽略的m106c3/runs目录，summary记录原目录和摘要；本目录保存可随文档交付的精简证据。`sha256.json`绑定本目录文件，排除摘要自身。

复查时在仓库根编译现有系统阅读器，再对新的runner目录执行检查；输出目录必须是全新目录，避免覆盖历史结果：

```sh
mkdir -p .ci/native-print-041
clang -fmodules-cache-path=.ci/native-print-041/module-cache -framework Foundation -framework PDFKit docs/verification/evidence/native-print-2026-11-13/inspect.m -o .ci/native-print-041/inspect
clang -fmodules-cache-path=.ci/native-print-041/module-cache -framework AppKit -framework PDFKit docs/verification/evidence/native-print-2026-11-13/render-document-pdf.m -o .ci/native-print-041/render
python3 docs/verification/evidence/native-print-2026-11-13/check.py <新的runner目录> <全新输出目录>
```

所有资料均为本地合成文档。隔离浏览器自动输出不代签真实用户系统打印对话框、取消/保存、真机/读屏或负责人验收；没有更改用户浏览器设置、调用实体打印机、上传、部署或执行远端CI。
