# 024 首页清理设计

使用现有工具与页面清单，新增纯legacyToolPath(pathname, hash)映射：仅pathname为/、fragment正确解码且等于preview工具routeName时返回getPage路径；无窗口/日志/网络，不读取或保存内容。返回受控页面路径，不接收query或外部URL。

main.ts在创建app/router、mount及startAnalytics前检查初始URL，命中即window.location.replace并跳过应用启动。初始首页SSG因此不会被错误工具组件hydrate；完整文档请求使目标获得正确SSG和敏感脚本边界。router/index.ts在现有敏感组判断前处理已挂载应用后续到首页旧hash的导航，同样replace并取消当前router导航；正常路由和分区hash沿用原逻辑。SSR无浏览器URL片段，无需新增服务端路由或页面。

HomeView删除迁移区和重复兼容链接、专用样式、已无用分类说明及不可达的空分组分支；全局main.css只删除未再使用migration-entry样式。隐私说明及完整政策入口保留，不将清爽理解为隐藏重要数据说明。

修改先精确更新依赖旧DOM的当前E2E：旧链接点击改为正常工具卡片入口，旧hash从DOM存在断言改为目标URL/页面与隔离断言，原敏感导航功能不删。新增全14映射、未知/畸形/非根路径和query不转传测试；保存新的首页截图和摘要，不覆写历史证据。执行类型、单元/组件、CSR/SSG、静态/身份/广告审计与双引擎完整回归，不安装依赖或部署。

关联：[规格](spec.md)、[任务](tasks.md)。

回归修正：同文档hash变更触发popstate时，location.replace后返回false会让Vue Router回退历史，从而取消目标文档跳转。旧hash分支在发起replace后保持守卫pending直到当前文档被替换，不执行取消导航的历史回退，也不挂载目标组件/启动统计。目标为已知同源路径，无等待计时或远端依赖；正常导航/敏感守卫分支不改。新增测试同时等待首页导航完成后再修改hash，避免把fragment写到原工具路径。
