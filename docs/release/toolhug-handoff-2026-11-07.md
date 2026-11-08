# 顺手集 ToolHug 发布包移交（2026-11-07）

本轮负责人授权本地打包、自行发布；未连接服务器、修改 Nginx 或部署。

## 本次产物

- [生产站点包](../../.ci/handoff/toolhug-20261107-clean-home-site.tar.gz)，789586 字节；仅含可公开的 81 个静态文件，22 份 HTML（21 页面及 404），14 个工具，包含最新品牌与首页清理。
- [SHA256 文件](../../.ci/handoff/toolhug-20261107-clean-home-site.tar.gz.sha256)。归档 SHA256：`caa1c8fe326a8e63c966fc13e8d08a02e1c31f7490fc6e17d321639de0309092`。
- 包 ID：`toolhug-20261107-clean-home`；包 manifest SHA256：`93b66eeb943c88c5247e7b9c347ef914c20cb4c401664600a74f232ad72b4750`。
- 来源 receipt：`.ci/release-01/candidates/toolhug-20261107-clean-home/receipt.json`；SHA256：`5ada4ad1acefc8c171c94a1ac45518a72f02e81c9e16686357547716576eadae`。
- 基线 HEAD：`856aea8dd3ec6305b6109bb062685ee7332f302e`；包含工作区未提交开发内容，来源摘要以候选 receipt 为准，不等同纯 HEAD 构建。

## 自行发布

本包采用 production SEO，正式域名固定为 `https://www.v7luck.com`，八个批准页面可索引，其余页面及 404 保持 noindex；广告关闭。更换域名需重新生成候选，不应手改包。

1. 先保留当前完整站点与 Nginx 配置作为回滚副本。在压缩包所在目录运行 `shasum -a 256 -c toolhug-20261107-clean-home-site.tar.gz.sha256`，应显示 OK。
2. 将压缩包解压到新的空发布目录。包内没有外层 site/dist 文件夹，解压后直接看到 `index.html`、`404.html`、`assets/` 等；不要解压覆盖到仍在服务的目录后宣称原子发布。按现有发布方式切换至新目录，站点根目录最终对应 `/home/toxbox/dist`。保留旧版本供回滚。
3. 沿用[已适配的 Nginx 配置片段](nginx-www.v7luck.com.locations.conf)及[部署说明](nginx-dist-deployment.md)中的服务器配置部分，勿使用后者旧日期的七工具包。未知路径必须返回真实 HTTP 404，不能使用首页 SPA 兜底。检查配置后再重载。
4. 上线后检查首页、14 个工具、关于/隐私/联系/条款、favicon、JS/CSS、HTTPS；随机未知路径应为 404，HTML 应重新验证缓存。检查旧 `/#totp` 跳转与敏感工具页隔离。根域 DNS、证书与跳转需在服务器侧复核。

只上传本次 tar.gz 解压出的文件，不上传仓库、`.ci`、receipt、manifest、metadata 或本移交文档。此包替代 2026-11-03 的历史七工具包。

## 实际验证与限制

本次生产候选生成成功，release-package create 与独立 verify 成功。归档逐项比对文件集合、大小与 SHA256（内容摘要），81 个文件全部匹配；22 HTML、八条 sitemap URL、favicon 和首页清理检查通过。未代执行服务器命令或公网验收。

打包前当前源码已通过类型检查、单元/组件 35 文件 282 测试、SSG 8 文件 10 测试、154 项迁移身份审计、Chromium/WebKit 412 项浏览器测试及构建。浏览器证据：`docs/verification/evidence/m106c3/runs/2026-11-07T04-33-38.042Z-13074/`；该浏览器回归针对打包前 preview 产物，并非远端生产站点。生产包使用同一业务源码重新生成并由候选与导出校验验证。

Firefox、真实移动设备、读屏及品牌商标清查尚未完成；不宣称线上部署、域名跳转或品牌权利已验证。
