# 设计

新增纯 TS imageConvert：参数、文件限制、等比尺寸与头部检查。JPG/PNG 复用已有 inspectImage，WebP 验证 RIFF 长度及 VP8/VP8L/VP8X 尺寸、拒绝动画。Worker 使用 createImageBitmap 与 OffscreenCanvas 解码/编码，显式核对输出 MIME（防止不支持 WebP 时静默回退 PNG），顺序释放位图。ZIP 使用已安装 jszip STORE，不安装依赖。能力不足中文报错，不上传回退。

Vue 页面仅维护选择、设置、状态和对象 URL，版本号隔离过期消息；下载结果表按成功批次提交。Worker 只回传白名单错误码及结果，不发送原始错误字符串。敏感页列表与广告排除清单新增对应路径，沿用独立文档和统计隔离方案。

SSG 页面增加为 22 加 404（23 HTML），工具为 15（办公9/开发6）；指南增加为15。更新明确数量验收而非移除断言，历史迁移账本保持。验证包括纯算法边界、SSG、真实 Worker 下载与既有全站回归。发布包沿用 build:release 输出 dist。
