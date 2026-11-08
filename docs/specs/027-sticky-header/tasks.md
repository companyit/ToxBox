# 任务

- [x] T01 规格与设计，负责人已授权。
- [x] T02 实现常驻导航与遮挡偏移。
- [x] T03 浏览器及构建验收，更新 dist。

## 验证记录

- 单元/组件：35 文件、282 测试通过。
- Chromium/WebKit：420 测试全部通过，新增 375/768/1440 滚动到底部、header 顶部位置、首页链接及分类切换验收。证据：`docs/verification/evidence/m106c3/runs/2026-11-07T05-53-10.937Z-21009/`。现有历史导航、锚点、敏感页面与布局回归保留。
- `npm run build:release` 退出 0，类型检查、production 构建、压缩包校验及 dist 输出摘要比对成功。
- 生产包 ID：`toolhug-20261107055634793-81ed4424`；SHA256：`1006c7df46856e0f9fd867ac761a8793ffdff14674c1a8728d4bbe7306714c9a`。根目录 dist 已更新，可直接上传其中内容。
- `git diff --check` 通过。未部署；未验证 Firefox、真实设备及读屏。
