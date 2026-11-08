# 031 文本差异对比验证

日期：2026-11-07。负责人要求继续开发其他功能，本轮按既有功能建议推进逐行文本对比；无新增依赖或远端部署。规格见[spec](../specs/031-text-diff/spec.md)、[design](../specs/031-text-diff/design.md)、[tasks](../specs/031-text-diff/tasks.md)。

## 实现与范围

新增纯TS `src/utils/textDiff.ts`、同源 `src/workers/textDiff.worker.ts` 和 `src/views/pages/TextDiffPage.vue`。LCS逐行最短增删序列，重复行同分优先删除原行；结果含类型、双方行号及新增/删除/保留计数。修改表示为删除加新增，不识别移动、字符级或JSON结构变化。CRLF/CR统一为LF，保留末尾空行，空字符串为0行；空格/制表符/大小写有意义。

每侧100,000 UTF-16码元、1,000行，矩阵约2 MiB，10秒可取消。支持交换、示例保护、仅看变化、复制当前筛选下的可读报告（非Git补丁）；复制失败聚焦并选中报告供手动复制。改输入/交换/取消清除结果并终止任务；版本隔离过期消息；pagehide/离页清空所有内容。不上传、不写入URL/日志/存储，敏感独立文档无第三方脚本。报告和表格均安全文本渲染，类型含中文/符号，不只靠颜色区分。

同步更新工具/页面/路由/指南、办公分类高亮、敏感路径和广告排除清单、隐私说明及明确SSG/工具数量验收。当前17工具（办公10/开发7）、24站点页加404（25HTML）、17指南；正式八页索引、广告关闭与域名不变。没有改动依赖或原始迁移身份账本。

## 实际结果

- `npm run test:vitest`：38文件、302测试通过。逐行样例、重复行确定性、空字符串/末尾换行/CRLF/空白、上限、报告筛选通过；另对二元字母表0～4行的961组组合使用独立递归编辑距离核对最短性，并从结果重建双方及核对行号。961组合包含在一个单元测试中，不重复计为961项测试。正式origin下新页面不初始化统计的测试通过。
- `npm run test:ssg`：11文件、13测试通过，新增页静态空输入、无结果、指南/noindex/无第三方脚本通过。
- `npm run test:inventory`：154项身份/SHA/owner审计与负向校验通过，原始账本及快照未变。
- Chromium/WebKit：462测试全部通过，证据 `docs/verification/evidence/m106c3/runs/2026-11-07T07-25-23.253Z-30690/`；run.json记录buildExitCode=0、testExitCode=0、portReleased=true，228.537秒；build-sha256.json绑定本轮源码、测试、配置、锁和SSG产物。
- 真实Worker覆盖375/768/1440行级结果/计数、筛选、交换、结尾空行、规范化相同、示例保护、清空焦点与HTML样式输入安全渲染。另覆盖字符/行限额不截断、复制失败、存储不变、无第三方请求、离页/pagehide清理。可控Worker覆盖取消、改输入后的迟到消息拒绝及10秒超时；没有把可控Worker当作真实算法证据。
- 已查看[375px完整页面](evidence/text-diff/width-375.png)，无横向溢出；另保留[1440px页面](evidence/text-diff/width-1440.png)。未验证真实设备、Firefox或读屏。
- `node scripts/check-adsense-readiness.mjs`：25HTML、100页脚链接、17指南，广告关闭；该脚本检查preview产物，正式包另经release校验。
- 类型检查、生产构建：`npm run build:release`退出0；包、归档解压及dist摘要核验通过。
- `git diff --check`通过。本轮无失败测试需豁免。

## 交付

包ID：`toolhug-20261107072944605-bcbc453f`。
[生产站点包](../../.ci/handoff/toolhug-20261107072944605-bcbc453f/toolhug-20261107072944605-bcbc453f-site.tar.gz)。
SHA256：`4ebc7b8fc8bd8b785a14f2ec1f787fb2a13297f9e6da6e18613b72acb628ed93`。

根目录dist已更新，可直接上传其中内容；旧dist保留在本次移交目录previous-dist。正式域名仍为 https://www.v7luck.com。未执行远端部署或公网验收。
