# 014 公网发布后验证

日期：2026-11-03。负责人确认已发布并明确要求重新验证。本轮仅进行公网 GET、浏览器合成输入验收和本地记录，未修改服务器、DNS 或广告设置。

## 结果

- 生产包的 54 个公开文件全部与此前校验的 `release-1793709636258-22f72176` 包逐字节一致（大小及 SHA256），无不匹配文件。
- www HTTPS 首页、关于、隐私、联系、条款、七个工具页返回 200，已包含 SSG 标记与静态正文；页面证书验证通过。HTTP www 返回 301 至 HTTPS。
- 随机未知路径和直接访问 `/404.html` 返回真实 404，正文为本站 SSG 错误页，noindex 且无 canonical；此前软 404 和已知页面缺失问题已解决。
- sitemap.xml、robots.txt 返回 200；sitemap 精确八条已批准 URL。既有索引页有正式 www HTTPS canonical，新 Contact/Terms 及新工具页保留批准的 noindex，不将本轮发布扩充为索引白名单批准。
- 页面引用的 15 个静态资源请求均返回 200；完整生产包 54 文件核对进一步覆盖其余按需脚本与资源。
- Chromium 156.0.8078.4、WebKit 27.2 对公网在 375/768/1440px 共检查 84 次已知页面：元信息、四页入口、无广告 DOM、无横向溢出，未发现 hydration mismatch 或 pageerror。
- 两引擎验证七工具核心流程：文本统计、JSON 压缩、URL 编码、Base64 转换、时间戳转换、UUID v4、使用公开 RFC 测试密钥和固定时间的 TOTP；联系邮箱及离页清空也通过。
- TOTP 页无 Analytics 标签和 gtag，清空正常；使用合成公开测试数据，所有第三方请求均在浏览器端阻断，未向 Google 发送本次测试统计或工具内容。因此本记录不验证 GA 后台接收。
- 无 JavaScript 时四个信任页及 Base64 页有可读正文。Firefox 和双稳定版本完整人工矩阵本轮未验证，不宣称全浏览器验收完成。

## 仍待处理的托管项

1. `https://v7luck.com/` 本次仍无法解析（curl exit 6）。本次 www 可访问不证明根域 DNS、根域证书/跳转或域名控制权已经完成。
2. 首页返回 Cache-Control 但没有 HSTS；Contact 页面及 404 有 HSTS，却没有 HTML Cache-Control。这与只保留旧 `/index.html` 缓存规则的配置表现一致。需对照已提供的 [Nginx 替换片段](../release/nginx-www.v7luck.com.locations.conf)统一 HTML 缓存和 HSTS；未读取完整实际配置，不能据响应推断所有配置细节。
3. 真实 AdSense 仍未启用，没有提供发布商 ID 或审核/CMP 信息，本次不验证 Google 批准或收入，也不启用 ads.txt。

## 证据

- [HTTP/HTTPS、SEO 和资源状态](evidence/adsense-readiness/published-check-2026-11-03.json)
- [54 文件摘要比较](evidence/adsense-readiness/published-package-comparison-2026-11-03.json)
- [公网浏览器结果](evidence/adsense-readiness/published-browser-results-2026-11-03.json)
- [可复查浏览器检查脚本](evidence/adsense-readiness/published-browser-check.mjs)

此前“本轮未发布”是当时本地交付阶段的事实；本次发布由负责人自行完成，以上仅确认探测到的公网状态。代码、配置和产物未由本轮代理改写。
