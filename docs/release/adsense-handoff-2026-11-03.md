# AdSense 接入前版本：生产移交材料

日期：2026-11-03。状态：本地生产候选、静态包和生产 SEO 浏览器检查通过；待负责人审阅正文、确认实际托管信息并独立授权部署。不加载广告，未变更 DNS/证书/服务器。

## 可审阅产物

- 包 ID：`release-1793709636258-22f72176`。
- 公开静态包：[release-1793709636258-22f72176-site.tar.gz](../../.ci/handoff/release-1793709636258-22f72176-site.tar.gz)，54 个普通文件。15 HTML（14 站点页 + 404）、8 条 sitemap URL；新 Contact/Terms 仍 noindex。
- 压缩包 SHA256：`74ee594d3cdf1fe4924b7497bc2b38365d8615aa5fbc47a489a05020e653580f`。
- 包 manifest SHA256：`c7d2bed2218d1a120ea73dcb3bd1a01e123ec6ba25ee76d6f8b62e187be183e8`。
- 生产 receipt：`.ci/release-01/candidates/release-1793709636258-22f72176-prod/receipt.json`。
- receipt SHA256：`df049a7b63013be163bf4625f771afb132afb86dbe2a5cc7349308c51a7660fe`。

压缩包只包含 `site/` 内公开文件，归档逐项与包 manifest 核对名称、大小与 SHA；无软链接、metadata、receipt、源码或审核记录。归档自身不等于已部署，不能上传整个仓库或整个 package 目录。

## 本轮验证

1. `node --test --test-concurrency=1 tests/release/package.test.mjs`：17/17 通过。覆盖 production/preview 隔离、重复 ID、缺失/篡改/额外文件、软链接及错误 SHA 拒绝；未覆盖原有默认 dist-ssg。
2. 针对同一生产候选启动本机预览，用 Chromium 156.0.8078.4、WebKit 27.2，在 375/768/1440px 共检查 84 次实际页面：标题、canonical、robots、四页导航、布局及无广告代码；无 hydration mismatch、pageerror 或外部请求。
3. 另验无 JavaScript 正文、8 条 sitemap、robots、Contact 尾斜杠 308、未知路径真实 404、Base64 行为及离页清空。生产域名上的 GA 网络行为不由 localhost 检查证明。
4. 浏览器关闭后重新验证候选及包来源摘要通过，公开归档逐项校验通过。此轮没有修改业务代码，不重复此前 186 项单元/组件、3 项 SSG 和 274 项预览 E2E；此前结果属于上一轮实际记录。

证据：[发布包测试](../verification/evidence/adsense-readiness/release-package-tests.log)、[生产浏览器结果](../verification/evidence/adsense-readiness/release-browser-results.json)、[归档摘要](../verification/evidence/adsense-readiness/release-archive.json)。

## 上线前还需明确

- 当前 Nginx 由直接管理、面板还是托管平台管理，实际静态目录和有效证书路径；不要在聊天中发送密码/私钥。
- 负责人审阅四页正文和运营事实，确认是否发布此包。按 AGENTS 的“发布需要独立授权”，继续开发不视为自动批准修改线上站点。
- 根域 DNS 和证书配置、根域跳转；之前探测根域无法解析，不代表本轮已修复。
- 线上软 404：之前未知路径返回 200，需结合实际配置审阅[静态 Nginx 示例](nginx-static.example.conf)，先在目标环境 `nginx -t` 验证，再按平台能力切换与验收。本机无 nginx/docker，未执行该平台语法与真实服务器验证。
- 保留上一完整可回滚包，明确切换与回滚方法；发布后复核四页、七工具、404、资源 MIME、HTTPS、SEO 和 2FA 隔离。

未获上述信息与独立发布授权前，保持本地交付，不购买域名、不签发证书、不登录远端或申请 AdSense。后续启用真实广告仍需发布商 ID、审核状态及同意管理方案另行确认。
