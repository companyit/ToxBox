# 设计

新增 Node 编排脚本，复用 release-candidate 和 release-package 的导出 API。先执行现有 type-check；版本 ID 采用 UTC 时间与随机字节。正式域名读取 config/site-release.json，不提供临时绕过参数。

使用系统 tar 导出 site 内容至唯一移交目录；通过临时目录解压并比较 digestDirectory，随后再次 verifyPackage，最后写 SHA 与来源说明。目录创建不覆盖既有目录，失败保留现场但无成功移交记录；临时解压目录在 finally 清理。运行需要系统 tar，缺失明确失败。压缩包不含审计元数据。无新依赖、路由或持久化方案变化。

验证为实际完整执行及独立产物核验；不重复全站浏览器回归，因为不改变页面行为。部署和线上验收由负责人执行。

生产包验证结束后，复制 site 到本次移交目录的 staging 子目录，使用 digestDirectory 比对；确认现有 dist 是真实目录，再将其重命名为本次移交目录 previous-dist，最后将 staging 重命名为仓库 dist。切换异常恢复原目录；无需删除原 dist。切换后独立核对摘要。此为本地输出目录切换，不声称服务器原子发布。handoff.json 记录输出目录和旧目录位置。所有候选校验先于修改受保护的 dist 完成。
