# 037 任务

- [x] T01 核对两套产物，建立BUILD-01～06及修正方案；负责人请求授权本地实现和标准构建验证。
- [x] T02 对齐build/build-only/preview，补显式noindex预览和CSR隔离，更新本地e2e/CI入口。对应BUILD-01～05。
- [x] T03 preview中间件按实际outDir读HTML，保留候选严格校验及404/308。对应BUILD-03。
- [x] T04 实际标准build、dist/site独立摘要及默认preview真实工具验收。对应BUILD-01～03/06。
- [x] T05 preview/CI回归、README和发布指南及进度/验证报告。对应BUILD-04～06。
- [ ] T06 真实托管、负责人/真机/读屏与系统保存签收，部署独立授权。

## 实际交付（2026-11-08）

标准build/build-only与CSR隔离实际执行通过；完整dist与正式site/归档摘要一致，28HTML/20工具/24索引/188PDF资源齐全。默认预览两引擎真实裁剪/PDF整理/JSON-YAML、robots/sitemap HTTP、自定义outDir及noindex预览共5项通过；332项单元组件、18项静态、154项身份审计、本地CI检查和最终noindex双引擎522项通过。详见[037验证](../../verification/037-build-entry.md)。T06保留，未部署或触发远端。
