# 设计

仅修改 SiteHeader、ToolCard、ToolPageLayout、CategoryPage 和导航样式。移除工具布局中不再使用的 tools 引用及网格样式，底部隐私提示使用独立 tool-privacy 类。保留全局键盘 focus-visible。更新现有 UI 浏览器验收中的相关卡片断言以符合本轮批准需求；验证类型检查、构建及 UI 浏览器交互。无新依赖和架构决策。

UI-026-03 在基础样式取消链接下划线。文本统计、JSON 格式化和 URL 编解码的主要按钮用边缘高亮提供悬停反馈，沿用键盘焦点轮廓。
