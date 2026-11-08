# 设计

使用 CSS sticky/top:0 和不透明主题背景，无滚动监听或自动隐藏。header 保留文档流，z-index 20，跳转主内容入口高于 header。通过 ResizeObserver 测量 header 实际高度（支持换行、字号变化），设置 CSS 变量供 scroll-padding 和路由锚点偏移使用；组件卸载时清理 observer 和变量。SSR 不读取 DOM，客户端挂载后设置。

验证现有类型检查/生产构建及 Chromium/WebKit 滚动、首页链接、分类切换和锚点测试。发布仍由负责人执行。
