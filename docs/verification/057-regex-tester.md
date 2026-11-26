# 057 正则表达式测试验证

2026-11-20 按已确认的 [RXT-01～04](../specs/057-regex-tester/spec.md) 实现，入口为 `/developer/regex-tester/`。

- 支持 JavaScript 正则的 `i`、`m`、`s`、`u` 标志，显示 UTF-16 起止位置和编号、具名捕获组，区分未参与与空捕获。零长度匹配可正常推进。
- Worker 在本地运行，支持取消、两秒超时、清空与离页释放。默认展示每页 50 项，最多 500 项，另有输出文本与组条目预算。页面接入目录、搜索、指南和敏感导航隔离。

| 检查 | 结果 |
| --- | --- |
| `npm run build:preview`、`npm run type-check` | 通过 |
| `npm run test:vitest` | 62 个文件、445 项通过，覆盖标志、精确位置、零长度、预算、释放旧任务及丢弃迟到结果 |
| `npm run test:ssg`、`npm run test:inventory` 和预览审计 | 21 项静态测试、154 项历史测试身份通过；33 份 HTML、132 处页脚和 25 份指南通过 |
| Chromium／WebKit 定向浏览器回归 | 首轮 27 项通过、1 项失败。WebKit 提前完成了用于触发超时的模式；改用会保持等待的测试 Worker 验证取消和超时，复跑 28 项全部通过。匹配、捕获组和分页仍由真实 Worker 验证 |
| 隔离生产候选 | 首轮因验证期间更新文档触发来源变更保护；文件稳定后复验 6 项通过。双引擎验证 33 页、24 页索引、四页广告白名单及敏感导航隔离。[候选结果](evidence/seo-growth/seo-1795178383203/results.json) |

Firefox、真机与读屏未验收。使用 `npm run preview:local` 试用，部署另行授权。
