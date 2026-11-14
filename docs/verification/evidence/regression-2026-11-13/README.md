# 040 回归证据

日期：2026-11-13，Node v24.21.0。基线 `9e16e2a6d9f6a5ad953db6e692e00f5f1937de71` 加本轮工作区改动，详见 [040 报告](../../040-current-regression.md)。

- [summary.json](summary.json)：六次 runner 的命令结果、浏览器版本/逐引擎状态、失败用例、对比度和原始记录 SHA256；含首轮端口失败、两次中止、修复后双引擎通过、Firefox 首轮完整失败及最终完整矩阵。
- [final-build-sha256.json](final-build-sha256.json)：最终源、e2e、夹具、配置、锁与全部 preview 文件摘要；原始副本来自本轮 runner，已与当前修改的源码比对。
- [chromium-webkit-build-sha256.json](chromium-webkit-build-sha256.json)：搜索边界修复后、Firefox 刷新补修前的双引擎 540 项通过版本，不能替代最终源。
- `*.txt`：每次类型、Vitest、身份检查、SSG、依赖恢复、浏览器探测和完整回归原始输出；`e2e-three-final.txt` 为最终完整回归，整体退出 1。首轮失败日志未覆盖。
- `preview-*.png`：搜索边界修复后的中间版本已查看截图；`final-*.png` 为最终源截图，手机模拟深色图已查看。均为本地 preview/noindex，不代表真机或线上状态。

最终三引擎 810 项全部执行：Chromium 270 通过、WebKit 270 通过、Firefox 267 通过/3 项 DOCX 原生打印点击超时；合计 807 通过、3 失败，无跳过/重试。失败保留，人工清单没有代签。类型和 preview 构建、332 项单元/组件、18 项静态及 154 项历史身份核对通过。

完整 HTML、下载、截图、trace 和 results.json 保留于仓库本地被忽略的 `docs/verification/evidence/m106c3/runs/`；summary 中记录各目录和原始文件摘要。本目录归档摘要与原始控制台日志，不将生成的大型浏览器报告混入业务源码或公开站点。
