# AdSense 接入前与后续上线清单

日期：2026-11-03。当前范围为四个信任页面、七工具原创使用指南及本地准备配置，负责人已明确暂不加载广告。

## 当前部署配置边界

正式 origin 沿用 `https://www.v7luck.com`，不购买/迁移域名或更改 DNS。源码配置不证明域名所有权。负责人应能管理域名注册商、DNS 和实际托管，并在 Google 按账号要求证明站点控制权。

优先使用既有 SSG 候选/打包流程；`npm run build:csr` 仅生成 CSR。新 Contact/Terms 暂为 noindex，不扩大既有八页 sitemap/索引批准清单；如需允许收录，先审阅并同步 `config/site-release.json`、`approvedIndexablePages` 及对应测试，不通过手改产物实现。

## 公开站点验收

发布另行授权后，实际核验：

1. `http://www.v7luck.com/` 永久跳转到 HTTPS；根域名按批准规则跳转到 www，证书覆盖对应主机且浏览器信任，不忽略 TLS 错误。
2. 所有页面直接访问与刷新成功，四页可从全站页脚到达，邮箱链接正确；所有七个工具核心流程可用，无虚构表单。
3. 未知路径真实 HTTP 404，已知尾斜杠规则正确；HTML/JS/CSS MIME 正确，无混合内容，不公开 metadata/、receipt 或源码。
4. 正式页面不被意外访问验证/robots 阻挡，preview noindex 策略不得误作公开正式 SEO；SSR/客户端 head 一致。
5. 检查正文及指南真实、有用，不将试用标记或声明改成未实现的成熟度承诺；AdSense 没有可保证获批的固定字数/页数公式。

## 实际接入前仍需确认

- 提供真实 AdSense 发布商 ID，核实账号/站点审核状态；只有 Ready 状态才能正式投放，不把 ID 配置等同审核通过。
- 明确投放页面、广告位置及自动广告策略；2FA 敏感文档继续排除广告/CMP/分析脚本，所有跨页入口保持文档隔离。不得将广告伪装成复制/下载/工具按钮，不鼓励点击。
- 按实际服务地区落实 Google 用户同意政策；对 EEA、英国、瑞士适用的个性化广告使用 Google 认证、集成 TCF 的 CMP。一个自制“同意”按钮不能宣称满足认证要求。不在本轮擅自加入 Cookie 或调整 GA。
- 上线前按实际采集行为更新隐私政策，披露 Google/第三方广告 Cookie、用途和退出方式；运营主体、适用法域与其他法定信息由负责人确认，不虚构。
- 用账号真实内容生成 `ads.txt`，不提交占位 ID；根域 `https://v7luck.com/ads.txt` 应返回实际文本或正确跳转到 www 文件并最终 HTTP 200，不能 SPA 回退 HTML。新增文件需同步严格发布资源白名单与校验，不能只放入 public 绕过验收。
- 在 Google 后台人工添加站点、验证、申请审核，后台状态及 CMP 发布另行记录；不保证获批时点或收入。

## 官方依据（2026-11-03 查阅）

- [站点页面准备：原创内容和清晰导航](https://support.google.com/adsense/answer/7299563?hl=en)
- [站点控制权与 HTML 访问](https://support.google.com/adsense/answer/91205?hl=en)
- [广告隐私披露](https://support.google.com/adsense/answer/1348695?hl=en)
- [认证 CMP 要求](https://support.google.com/adsense/answer/13554116?hl=en)
- [ads.txt 指南](https://support.google.com/adsense/answer/12171612?hl=en)
- [根域 ads.txt 抓取](https://support.google.com/adsense/answer/7679060?hl=en)
- [站点审核状态](https://support.google.com/adsense/answer/12170222?hl=en)

以上政策是动态外部信息，实际启用广告前应再次核对官方要求。页面/条款的实现不代替负责人对业务事实和适用地区义务的确认。

## 本轮公网探测与托管修正建议

2026-11-03 只读 curl 检查：`https://www.v7luck.com/`、`/about/`、`/privacy/` 返回 200，TLS 校验结果为 0；`http://www.v7luck.com/` 返回 301，Location 为 `https://www.v7luck.com/`。根域 `https://v7luck.com/` 在该次探测无法解析；不存在路径 `/nonexistent-adsense-check-20261103/` 返回 200，属于 HTTP 软 404。

公网响应头显示 Nginx。已准备[静态托管配置示例](nginx-static.example.conf)，使用已验证的 SSG 发布包和真实 HTTP 404，供负责人结合实际目录、证书、完整现有配置及部署授权审阅；本轮未执行 `nginx -t`、reload、DNS 或证书变更。示例不证明线上已修复。根域应先配置正确 DNS 并具备对应证书，再设置 HTTPS 跳转；不能用仅覆盖 www 的证书假装根域 HTTPS 可用。

上述只读结果不证明域名所有权；公网当前页面也不代表本轮源码已部署。访问日志和 CDN/代理规则须结合真实平台确认。
