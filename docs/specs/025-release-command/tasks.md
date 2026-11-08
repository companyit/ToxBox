# 任务

- [x] T01 明确授权、需求与设计。
- [x] T02 新增编排命令及发布说明。
- [x] T03 实际执行并记录产物校验结果。

## 实际验证

`npm run build:release` 实际执行退出 0：类型检查、生产候选、包导出/verify、tar 解压后文件集合与摘要比对均通过。

产物：`.ci/handoff/toolhug-20261107050912967-e98d5082/toolhug-20261107050912967-e98d5082-site.tar.gz`。
SHA256：`c887e382cb33c38995e0f1f75ec975653b28a122cebeb319b69d0f8fdf962951`。
未修改业务页面，未重复浏览器回归，未部署。

- [x] T04 按追加授权输出生产 dist：暂存摘要比对、保留原 dist、切换失败恢复、终端及来源记录输出路径。

T04 验证：实际执行 `npm run build:release` 退出 0（类型检查、构建、归档验证、dist 输出比对）；独立摘要检查 dist 与正式包 site 一致，81 文件/22 HTML，四个文档工具页面及 robots/sitemap 均存在，无 metadata 或 handoff.json；原 dist/index.html 存于本次 previous-dist。此次未模拟系统文件操作失败，不宣称恢复分支已故障注入验证。产物 ID：`toolhug-20261107051549928-ee37b921`，归档 SHA256：`33156d2ab3ae64192d6f3ed818106394b407e5a990b5e73c01a66b41f8c26676`。无页面行为修改，未部署。
