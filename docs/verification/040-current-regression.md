# 040 当前版本全站回归与测试修复

日期：2026-11-13（Asia/Shanghai）。负责人在开发进度核对后要求继续下一步开发，本轮按 [040 规格](../specs/040-current-regression/spec.md) 推进既有功能验证、测试修复和文档同步。

## 被测范围

基线 HEAD：`9e16e2a6d9f6a5ad953db6e692e00f5f1937de71`，开始时工作区干净；Node `v24.21.0`。本轮修改 14 个 e2e 文件的入口定位器、`ui-refinement.spec.ts` 的焦点检查、`image-crop.spec.ts` 的测量精度、`base.css`/`HomeView.vue` 的搜索边界及清除按钮刷新行为，以及规范/进度文档，无业务算法、配置、package 或锁文件修改。当前仍为 20 工具（办公 13、开发 7）、28 HTML、20 指南。

本次只重建本地 preview/noindex 产物，不切换正式 `dist/` 或生成正式移交包，不执行 Git 写操作、远端 CI、服务器设置、搜索平台提交或部署。

## 首轮失败与修复

ENV-040-01：首轮类型检查退出 2；单元/组件 37 文件通过、9 文件导入失败，已执行的 290 项通过，整体退出 1；历史身份审计随依赖测试失败退出 1。`npm ls --depth=0` 确认本地缺少已声明并锁定的 jszip、mammoth、pdf-lib、pdfjs-dist 和 yaml，不能把这些导入失败认定为算法缺陷。

使用独立临时缓存执行 `npm ci --ignore-scripts --no-audit --no-fund`，按现有锁文件恢复 272 个包；未添加、升级依赖或运行安装脚本。恢复后类型、332 项单元/组件和 154 项历史身份核对通过。

TEST-040-01：第一轮浏览器全站回归在 CSV 首页入口超时，因 038 已将界面改为“打开工具”，测试仍精确查找“试用工具 ：CSV 与 JSON 表格互转”。页面快照确认新入口存在。核对同类用例后，仅更新 14 个 e2e 文件中 17 处旧前缀（其中一处为多名称数组），保留工具名、`exact: true`、点击后的行为和隐私断言，不跳过测试或放宽检查。

首轮运行因相同旧前缀问题主动中止，结果为 18 通过、1 失败、519 未执行，退出 130，端口已释放；不将未执行项计作通过。原始记录位于 [首轮 run.json](evidence/m106c3/runs/2026-11-13T12-20-09.866Z-3513/run.json) 和 [首轮浏览器结果](evidence/m106c3/runs/2026-11-13T12-20-09.866Z-3513/results.json)。此前沙箱内监听 4177 端口 EPERM，构建前退出的记录同样保留。

UI-040-01：第二轮 Chromium 完成 269 项，其中 7 项失败。六项搜索框边界对比度分别约为浅色 1.35:1、深色 1.69:1，低于既有 3:1。039 更新了通用装饰边框色，但搜索输入复用了该颜色。本轮新增 `--color-control-border`（浅色 `#75879b`、深色 `#7088a3`）并仅用于首页搜索输入，保留装饰边框和原有焦点/文字检查。

TEST-040-02：第七项是旧卡片焦点断言写死历史色值 `rgb(23, 99, 79)`，并立即采样尚在过渡中的边框。本轮按 039 当前主题品牌色验证最终 `focus-within` 边框，使用自动等待且补深色覆盖；仍检查实际可见 outline，不降低标准。

第二轮 Firefox 已执行部分工具，DOCX 375px 预览、Worker 和打印 CSS 检查后，真实原生打印按钮调用阻塞超时（ENV-040-02）。为修复上述已知问题中止该轮，总计 284 通过、8 失败、515 未执行，退出 130，端口释放。其 [run.json](evidence/m106c3/runs/2026-11-13T12-21-43.786Z-3784/run.json) 和 [结果](evidence/m106c3/runs/2026-11-13T12-21-43.786Z-3784/results.json) 保留；不把 Chromium 跑完冒充全部通过，也不以 mock 替代 Firefox 原生打印测试。

搜索边界及焦点修复后，Chromium/WebKit 全站 540 项通过。随后单独完成 Firefox 270 项（265 通过、5 失败，无跳过）：375/768/1440px 三项原生打印阻塞，以及以下两项；[原始结果](evidence/m106c3/runs/2026-11-13T12-30-37.922Z-5638/results.json) 和 [run.json](evidence/m106c3/runs/2026-11-13T12-30-37.922Z-5638/run.json) 保留。

- UI-040-02：首页刷新 trace 报告 disabled 属性接管不一致。Firefox 会跨刷新恢复按钮动态状态，[Mozilla 同类记录](https://bugzilla.mozilla.org/show_bug.cgi?id=1847798) 说明该行为可能影响 hydration；结合现有输入 autocomplete=off，本轮仅给清除按钮补 autocomplete=off，保留 ready 门禁。未忽略 hydration 错误或修改浏览器偏好。
- TEST-040-03：1440px 裁剪手柄边界被测为 43.99998474121094px，CSS 实际仍为 44px。本轮增加计算样式严格等于 44px 的检查，boundingBox 仅容忍 0.0001px 浮点误差；未缩小控件或取消尺寸检查。

最终源（包含这两项补修）重新执行三个浏览器全站，结果见下表，不将中间版本 540 项通过替代最终源验证。

## 实际检查

| 检查 | 结果 |
| --- | --- |
| 恢复依赖后的 `npm run type-check` | 退出 0 |
| `npm run test:vitest` | 46 文件、332 项通过，退出 0 |
| `npm run test:inventory` | 154 项历史身份/原文件 SHA/唯一 owner/发现目录核对通过，缺项及重复身份负向夹具被拒绝，退出 0；不是 154 项新增业务测试 |
| 首次新 preview 构建后的 `npm run test:ssg` | 16 文件、18 项通过，退出 0 |
| 搜索边界/焦点修复后 `node scripts/e2e-run.mjs chromium webkit` | 中间版本 540 项全部通过（两引擎各 270），无跳过/重试；构建和测试均退出 0，摘要复核通过、端口释放 |
| 修复后的 `npm run test:vitest` / `npm run test:ssg` | 再次执行，332 / 18 项通过，均退出 0 |
| `node scripts/e2e-run.mjs firefox` | 中间版本 265 项通过、5 项失败（上述三项打印及两项已补修问题），退出 1 |
| 最终 `node scripts/e2e-run.mjs chromium firefox webkit` | 810 项全部执行，807 通过、3 项 Firefox 原生打印点击超时；无跳过/重试。类型及 preview 构建退出 0，测试退出 1，源/测试/夹具/配置/锁/产物摘要复核通过，端口释放 |

Firefox 沙箱内启动以 SIGABRT 退出；在允许浏览器运行的环境下，已安装 Firefox 157.0 成功启动，不重装或修改浏览器配置。本次补跑其现有完整功能矩阵，启动成功本身不算功能验收。

Chromium/WebKit 中间版本原始记录为 [run.json](evidence/m106c3/runs/2026-11-13T12-25-48.826Z-4489/run.json)、[浏览器明细](evidence/m106c3/runs/2026-11-13T12-25-48.826Z-4489/results.json)；[源/测试/夹具/配置/锁/产物摘要副本](evidence/regression-2026-11-13/chromium-webkit-build-sha256.json) 单独归档。本轮两个引擎下搜索输入边界对比度均为浅色 3.6873:1、深色 4.5765:1，保留原 3:1 门槛；焦点、文字与卡片检查通过。

已实际查看 [1440px 浅色桌面](evidence/regression-2026-11-13/preview-light-desktop.png) 和 [375px 深色手机模拟视口](evidence/regression-2026-11-13/preview-dark-mobile.png)，搜索框边界清晰，首页/卡片布局保持，无横向溢出。这是本地 preview 截图，不代表真机或线上效果。

最终完整运行见 [run.json](evidence/m106c3/runs/2026-11-13T12-35-29.930Z-6359/run.json)、[浏览器明细](evidence/m106c3/runs/2026-11-13T12-35-29.930Z-6359/results.json)、[最终源/产物摘要副本](evidence/regression-2026-11-13/final-build-sha256.json) 及 [各轮摘要与失败明细](evidence/regression-2026-11-13/summary.json)。最终版本分别为 Chromium 156.0.8078.4（270/270）、WebKit 27.2（270/270）、Firefox 157.0（267/270）；最后仅剩 DOCX 375/768/1440px 的真实原生打印点击超时。首页刷新、裁剪手柄、入口流程和主题检查通过，不将该轮整体退出 1 写为全通过。

最终源另保留 [桌面浅色截图](evidence/regression-2026-11-13/final-light-desktop.png) 和 [手机模拟深色截图](evidence/regression-2026-11-13/final-dark-mobile.png)，已查看后者。每轮 runner 原始证据均包含源/测试/夹具/配置/锁/产物摘要。独立日志以 `.txt` 保留在 [证据目录说明](evidence/regression-2026-11-13/README.md) 所列目录，不因日志忽略规则遗漏归档。package/lock 与基线原文相同，摘要和当前源码比对通过。

交付前 `git diff --check`、040 规格/报告/证据说明的相对链接、所有归档文件摘要通过；最终全部 src、e2e、夹具、Playwright 配置、锁文件及 dist-ssg 文件集合/摘要再次与最终 runner 记录一致。变更限于上述两份展示源码、15 个 e2e 文件、产品/040 文档和本轮证据，未覆盖既有历史证据。

## 剩余范围

本轮自动化不代签 [20 工具人工清单](local-review-20-tools-2026-11-08.md)。负责人视觉与业务签收、真实手机/软键盘、实际读屏、系统打印/保存、真实剪贴板粘贴以及更多图像/PDF/字库/压力矩阵保持待验收；Firefox 自动化不等于目标浏览器全部版本验收。

Firefox 原生打印限制需在可交互环境中实际操作并独立打开保存结果后再判断；现有超时本身不能证明生产环境打印功能失效，也不能作为通过。此次保留三项失败及 ENV-040-02，不取消测试或代签打印/保存。

线上 HTTP/MIME/缓存、真实网络性能/Core Web Vitals、搜索平台收录、远端 CI 及分支保护未在本轮核验。未运行新依赖审计，不依据旧记录断言当前漏洞数量。正式站点和正式包不会随本轮 preview 回归更新。
