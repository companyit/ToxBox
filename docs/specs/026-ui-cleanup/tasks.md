# 任务

- [x] T01 明确规格与实现授权。
- [x] T02 精简导航样式及底部重复入口。
- [x] T03 验证并记录实际结果。

## 实际验证

- `npm run test:vitest`：35 文件、282 测试通过。
- `npm run test:ssg`：8 文件、10 测试通过。
- Chromium/WebKit：414 项通过，证据 `docs/verification/evidence/m106c3/runs/2026-11-07T05-31-00.590Z-19561/`。覆盖悬停样式、明暗主题、多宽度、隐私提示及历史导航清理。
- 首次受限运行因本地端口 EPERM 未启动；获环境许可后运行。一次旧测试仍点击已移除的相关工具入口而超时，保留失败现场；改为现有分类导航并保留历史/输入清理断言，重新完整运行通过。
- `npm run build:release`：类型检查、生产构建、归档及 dist 摘要校验通过，已更新根目录 dist。发布包 ID `toolhug-20261107053418084-32cad7f7`，SHA256 `e7f01f744adef9bd35aa7bcc5eb7fe0504958c22e2b34427b5ece23fa6c87fb0`。
- `git diff --check` 通过。未部署，未执行 Firefox/真实设备验收。
