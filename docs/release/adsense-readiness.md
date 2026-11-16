# AdSense 接入前与后续上线清单

## 2026-11-14 当前接入：正式4页启用加载器（048）

负责人已明确授权开启广告，048替代下方047“只meta、广告关闭”的阶段状态。正式production仅 /、/office/、/developer/、/about/ 输出提供的async/crossorigin脚本；保留首页元标记。全部工具页与preview无广告，跨广告边界完整导航。源码配置stage=integration表示代码接入，不代表Google审核通过或线上已投放。

本地标准`npm run build`生成生产dist及移交归档；实际本轮结果和路径见[048验证](../verification/048-adsense-script.md)。发布仍需独立授权，当前没有部署。发布后在AdSense核对站点/账号状态，并按需要开启后台自动广告、核对4页投放及工具页排除；仅接入加载器无法证明广告实际出现。[Google自动广告设置说明](https://support.google.com/adsense/answer/9261307?hl=en)。

按实际服务地区核对Google的同意管理要求，EEA/英国/瑞士的个性化广告需要Google认证且集成TCF的CMP，后台可选择Google或其他支持方案；本轮没有设置CMP或代签已同意，见[Google官方要求](https://support.google.com/adsense/answer/13554116?hl=en)。没有提供广告单元或ads.txt内容，本轮不生成手工广告位/ads.txt；后续按真实账号信息及另行授权处理。

生产审计用`node scripts/check-adsense-readiness.mjs production dist`，preview用默认命令；只放行配置4页的精确加载器，其他远端脚本、重复/错ID/错页脚本或手工广告位继续拒绝。以下保留历史。

## 2026-11-14 所有权验证当前步骤

负责人已选择并授权047元标记方式。正式production构建仅在首页head输出：

```html
<meta name="google-adsense-account" content="ca-pub-2420716265318225">
```

preview工具预览不输出此标记；未加载广告脚本、未生成ads.txt或广告位。当前21工具/29HTML/21指南，正式24页索引不变。历史“ID缺失/七工具/八页索引”保留为当时记录。

本轮只生成隔离生产测试候选，未更新正式dist/移交包或部署。后续获准正式构建/交付时使用现有`npm run build`流程；部署后检查`https://www.v7luck.com/`的原始HTML head中只有一份上述标签，其他页/preview无标记，再由负责人进入AdSense对应站点选择“元标记”并点击验证/申请审核。此验证代码应随生产发布保留，不在审核后擅自移除。

本地审计：`node scripts/check-adsense-readiness.mjs`默认审计preview；正式产物用`node scripts/check-adsense-readiness.mjs production dist`（须已生成本轮正式dist）。审计产物须与命令模式匹配，不以preview通过代表正式站点通过。部署和Google后台操作未授权、未执行；验证不等于审核获批或广告投放。

实际本地证据与限制见[047验证](../verification/047-adsense-ownership.md)。官方方式见[关联网站说明](https://support.google.com/adsense/answer/7584263?hl=zh-Hans)；后续正式投放仍需按实际地区/配置另审广告与同意策略。以下保留历史记录。

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
