# 043 示例保护错误恢复修复

日期：2026-11-15。负责人要求继续优化，按043 COBJ-06既有示例保护范围修复，不新增功能模式、依赖、服务或发布。

## 问题与修改

`CsvJsonPage.vue`的状态展示优先使用error。转换报错后点击“填入示例”，保护分支仅设置message，导致旧错误遮住“请先清空现有输入”提示，错误字段标记也未撤销。现清除error及errorCode后显示操作提示，输入、方向、模式、路径和已有结果不被覆盖；未修改算法或资源上限。

修改包括该页面、`tests/components/csvJson.test.ts`、`e2e/csv-json.spec.ts`及043规格/设计/任务和当前进度。组件及浏览器验证CSV二维/对象模式的引号或重复表头错误、JSON语法错误及路径错误四种场景。

## 本轮证据

- 新增组件测试在修复前失败：预期清空提示，实际仍显示CSV引号错误；1失败/14通过，见[复现日志](evidence/csv-object-recovery-2026-11-15/reproduce.log)。此为确认缺陷的预期失败。
- 修复后54文件402项单元/组件通过，见[日志](evidence/csv-object-recovery-2026-11-15/vitest.log)。
- 类型检查与完整preview构建通过，生成30HTML，见[构建日志](evidence/csv-object-recovery-2026-11-15/build.log)。
- Chromium/WebKit定向浏览器回归30/30通过，各15项，无失败/跳过/重试；[日志](evidence/csv-object-recovery-2026-11-15/browser.log)、[结构化结果](evidence/csv-object-recovery-2026-11-15/browser/results.json)。
- [源码、用例及产物摘要](evidence/csv-object-recovery-2026-11-15/build-sha256.json)绑定本次定向测试，未复用旧preview。

本轮仅复验CSV/JSON页，不将前轮586项全站结果称为本轮重新通过。Firefox profile启动、真实设备、读屏和系统剪贴板缺口沿用[前轮报告](043-csv-object-output.md)，本轮未修改浏览器环境或重试Firefox。未更新生产dist、操作远端或部署。
