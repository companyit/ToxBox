# 056 URL 参数解析验证

日期为 2026-11-19。负责人回复「推进」后按 [UQP-01～05](../specs/056-url-query/spec.md) 实现，入口为 `/developer/url-query/`。

- UQP-01～04。纯 TypeScript 解析完整 HTTP/HTTPS URL 或查询字符串，保留重复键、空名称、值内等号及原顺序。无等号与空值分别显示，表单模式可将字面加号解释为空格。非法转义或超限时保留输入并清空结果。每页 50 条，支持键盘翻页。
- UQP-05。页面复用敏感文档隔离并接入开发者目录、搜索、导航、指南和静态渲染。参数只在浏览器内存中处理，离页清除输入，结果按文本展示。新增页 noindex，无统计或广告。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| `npm run build:preview`、`npm run type-check` | 通过，生成 32 份 HTML |
| `npm run test:vitest` | 60 文件 438 项通过。首轮唯一失败为路由唯一性检查沿用 30 个页面，已按 31 个站点页面修正 |
| `npm run test:ssg`、`npm run test:inventory` | 19 文件 21 项静态测试、154 项历史测试身份通过 |
| `node scripts/check-adsense-readiness.mjs preview dist-ssg` | 32 份 HTML、128 处页脚和 24 份指南通过，预览无广告脚本 |
| Chromium 和 WebKit 定向回归 | 首轮 366 项通过，4 项失败。两引擎分别命中开发者目录数量过时和 JSON 脱敏静态字段默认值断言。修正后，两组原失败用例与 056 用例共 8 项通过。056 覆盖入口、整页隔离、网络、375 像素布局、键盘分页及原文保留 |
| `node --test tests/release/seo-growth.test.mjs` | 隔离生产候选 6 项通过，验证两引擎 32 份页面、24 页索引、四页广告白名单及敏感导航隔离。[结果](evidence/seo-growth/seo-1795100079179/results.json) · [候选记录](evidence/seo-growth/seo-1795100079179/candidate.json) |

浏览器验证覆盖 Chromium 和 WebKit。Firefox、真实设备及读屏仍待验收。预览使用 `npm run preview:local`，部署需独立授权。
