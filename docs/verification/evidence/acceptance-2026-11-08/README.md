# PDFKit 独立复核证据

追加交付链路验收材料：`release-tests.log`为17项隔离测试输出，`release-test-artifacts.json`记录候选/测试包独立摘要，`release-static-checks.json`记录production模式测试包的页面/索引/PDF资源数量核对。这些测试包不是正式移交版本，未部署；相关文件摘要已追加到`sha256.json`。

2026-11-08，macOS 27.0（26A428）arm64，系统PDFKit。只处理自制合成资料。

`pdfkit-checks.json`记录来自本轮双引擎测试的47份PDF及SHA256、147页的文本/尺寸/旋转、PNG前缀及54页图片像素检查。原PDF位置写在各项input，绑定上一级验收报告所引用的浏览器run。PNG为系统PDFKit重新渲染的结果，不是浏览器页面截图。

`inspect.m`为本轮临时复核器源码；`render-document-pdf.m`复制自项目既有渲染器；`check.py`记录批量复核过程，`pdfkit.log`为实际批处理输出。`sha256.json`绑定报告、复核源码、日志及PNG；不包含本README和manifest自身。

复查时在仓库根建立`.ci/acceptance-2026-11-08`，用clang分别编译inspect.m（Foundation/PDFKit）及render-document-pdf.m（AppKit/PDFKit），二进制同名放在该目录；在仓库根执行`python3 docs/verification/evidence/acceptance-2026-11-08/check.py`。脚本使用固定的原始run，执行会重写该目录部分证据，宜在副本中复查。

批处理之后另执行的补充断言：对orientations.pdf使用`scripts/verify-image-pdf-renders.py`的`check(prefix, 'orientations')`；对三份docx-print.pdf合并各页提取文本，确认包含“本地转换标题”“表格甲”“表格乙”“中文测试”。这些结果已写入最终JSON。图片检查覆盖两份9页方向文件及12份3页图片PDF，共54页。

有页序/旋转预期的文件：organized.pdf为原页5/1/3/4/6、旋转270/0/180/180/0，并核对原第1页嵌入字形“工”的提取；merged.pdf为300-1/200-1/200-2、旋转0/0/90；selected.pdf为5/1/2/3、旋转0/0/0/90；单页文件分别为原第1页和第3页。该检查只证明合成样例结果，不代表任意文档兼容或操作系统人工保存签收。
