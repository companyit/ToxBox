# 设计

SiteHeader 在 360–639px 使用紧凑间距和字号，flex 仍允许换行；不隐藏导航项目。ToolCard 增加 focus-within 边框。LocalToolEditor 主按钮增加独立 primary-action 类，以已有 accent/on-accent token 配色，悬停仅作用于启用按钮，保持禁用状态语义。无新依赖、不加入动画。

更新既有 UI 测试检查手机导航位置、44px 点击高度及卡片键盘状态。执行类型/生产构建、单元组件和 Chromium/WebKit 验收，更新 dist。
