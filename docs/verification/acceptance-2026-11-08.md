# 19 工具本地自动化验收复核

日期：2026-11-08（Asia/Shanghai）。负责人要求“验收推动”，本轮重新执行现有本地验收，不新增功能、依赖或生产包，不执行 Git 写操作、远端设置或部署。

## 基线与结论

被测 HEAD：`e86985030c91e39b325341b6a89e44d1462e11fa`。开始时工作区无受跟踪文件改动。Node 为 `v24.21.0`，与 `.node-version` 一致。当前19工具（办公12、开发7）、27HTML、19指南。

本轮本地自动化验收通过；负责人、真机、读屏及操作系统保存验收仍待执行，不能据此宣称完整验收或发布就绪。

## 本轮实际执行

| 检查 | 实际结果 |
| --- | --- |
| `npm run test:vitest` | 41文件、317项单元/组件通过 |
| `npm run test:inventory` | 154项映射/原文件SHA/唯一owner/发现目录及负向夹具通过；不是154项新增功能测试 |
| `node scripts/e2e-run.mjs chromium webkit` | 重新构建并验证页面集合、源/测试/夹具/配置/锁/产物摘要，502项通过 |
| 上述runner内的 `npm run build` | 类型检查与CSR/SSG构建通过，更新本地preview产物 `dist-ssg` |
| `npm run test:ssg` | 13文件、15项通过 |
| `node scripts/check-adsense-readiness.mjs` | 27HTML、108页脚链接、19指南通过，广告关闭；域名归属及广告审批仍未验证 |

浏览器最终原始结果见 [run.json](evidence/m106c3/runs/2026-11-08T00-51-37.449Z-2161/run.json)、[结果明细](evidence/m106c3/runs/2026-11-08T00-51-37.449Z-2161/results.json)和[源与产物摘要](evidence/m106c3/runs/2026-11-08T00-51-37.449Z-2161/build-sha256.json)。本轮没有发现需要修改业务代码的失败。

首次runner因沙箱禁止监听127.0.0.1:4177而在构建前退出，见[失败记录](evidence/m106c3/runs/2026-11-08T00-51-19.283Z-2048/run.json)。获准启动本地服务后重新完整执行，以最终运行结果为准。

## 继续推进：独立阅读器复核

本轮继续使用系统PDFKit重新打开和渲染上述浏览器run的全部47份PDF，共147页；全部成功。有明确预期的PDF整理、合并、选页及单页导出，其页序/旋转检查通过；整理文件嵌入字形“工”可提取。三份DOCX打印产物均可提取中文标题、表格文字及正文；实际查看其中第一页，标题、列表、表格与合成图片可见。

两份9页方向样例及12份3页图片PDF共54页，通过独立颜色取样、方向、页序、白底和留白检查。实际查看PDF整理导出的原第1页，文字、红色矩形及嵌入字形可见。结果、输入SHA256、渲染PNG和复查步骤见[PDFKit证据](evidence/acceptance-2026-11-08/README.md)及[逐文件记录](evidence/acceptance-2026-11-08/pdfkit-checks.json)。没有修改业务代码或重新构建。

Firefox继续探测：临时关闭测试进程子沙箱及使用仓库内独立持久profile，均仍在启动阶段提示`Could not find profile folder`。未更改安装和项目配置，未加载业务页面，不能宣称支持矩阵已补齐。

## 继续推进：交付链路隔离测试

执行`node --test --test-concurrency=1 tests/release/package.test.mjs`，退出0，17项通过。测试在`.ci/release-01`创建独立production/preview候选和测试包，不执行`build:release`，不输出正式移交归档或切换根目录dist。

正向候选及测试包验证通过；preview导出、ID重用、SUCCESS缺失、文件篡改、manifest/receipt改变、额外文件、符号链接和错误外部摘要均被拒绝。完整输出见[测试日志](evidence/acceptance-2026-11-08/release-tests.log)，候选和测试包路径及独立摘要见[测试产物记录](evidence/acceptance-2026-11-08/release-test-artifacts.json)。测试包site包含294个文件，其身份仅为隔离验收样例。

对该测试包另做静态核对：27HTML、8个canonical与sitemap URL集合一致、其余19HTML为noindex、robots引用正式sitemap、188个PDF资源文件，全部通过。结果见[静态记录](evidence/acceptance-2026-11-08/release-static-checks.json)。首次人工复核脚本将4个目录也算入文件数，得到192而断言失败；改为仅统计普通文件后为188，未修改站点或豁免断言。

这些结果补充生产模式生成及防篡改链路证据，不替代生产页面浏览器回归、实际托管HTTP/MIME/缓存或正式移交签收。032要求的根目录生产dist/正式包一致性仍未完成；无远端设置或部署。

## 仍待人工操作

Firefox仅做已安装浏览器的启动探测，默认临时目录及 `TMPDIR=/private/tmp` 均以 `Could not find profile folder` 退出；未执行Firefox功能矩阵，未重装浏览器。该环境缺口仍保留。

[19工具人工验收清单](local-review-19-tools-2026-11-07.md)的R01～R19及S01～S07继续保留人工“未测”，本轮自动化结果不代签。建议按以下顺序记录实际结果：

1. R01、R04、R05、R09～R11、S05：实际下载/独立打开、DOCX系统打印另存及复制粘贴。
2. S03、S04：真实手机触控/软键盘、全键盘操作与真实读屏。
3. 其余工具核心流程、信任页面及品牌审阅，最后填写执行环境、失败编号和负责人结论。

032的生产dist/正式包一致性、033人工签收任务仍未完成。更广文档/字库/解码/压力矩阵及历史依赖审计告警没有在本轮关闭；未重跑依赖审计，不断言其当前数量。正式dist、生产包和线上版本不因preview回归通过而自动同步。034图片裁剪仍为候选规格，未实现。
