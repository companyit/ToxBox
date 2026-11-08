# 014 AdSense 接入前准备验证

日期：2026-11-03。负责人要求按四页、独立域名、HTTPS、原创内容和导航要求开发，随后确认公开邮箱 huangjemdev@gmail.com，明确选择“先完成页面、内容和接入前配置，暂不加载广告”。本轮按该确认范围先维护规格及 ADR-024，再实施本地代码与准备配置。未部署或变更远端。

## 修改文件与实际行为

- `docs/specs/014-adsense-readiness/` 下 spec/design/tasks、`docs/product/requirements.md`、`docs/architecture/decisions.md`：记录 P1-12、ADS-01～09、方案及授权边界。
- `src/views/pages/AboutPage.vue`、`ContactPage.vue`、`PrivacyPage.vue`、`TermsPage.vue`、`src/data/site.ts`：关于、公开联系、隐私及条款；如实区分已有 GA 和未启用 AdSense，不虚构运营主体或邮箱接收承诺。
- `src/data/pages.ts`、`src/router/routes.ts`、`src/components/layout/SiteFooter.vue`：四页入口、独立元信息、两条新路由；Contact/Terms noindex。现为 14 页 + 404，正式八页索引白名单保留。
- `src/data/toolGuides.ts`、`src/components/layout/ToolPageLayout.vue`：七工具各自的场景、步骤、示例解读、边界提醒和问答；原算法及工具交互不变，2FA 第三方脚本隔离保留。
- `config/adsense-readiness.json`、`scripts/check-adsense-readiness.mjs`：广告关闭、发布商 ID 缺失和 2FA 排除路径的准备配置；只读审计实际静态页面、页脚、指南及 HTML/JS 中无广告加载代码，无 ads.txt。此审计不证明域名/审核/法律事项通过。
- `scripts/ssg.mjs`、`scripts/e2e-run.mjs`、`tests/unit/routingSeo.test.ts`、`tests/ssg/output.test.ts`、`tests/ssg/validators.test.ts`、`e2e/pages.spec.ts`：精确更新 15 HTML 和新路由的断言，不放松校验，历史迁移身份保留。
- `e2e/trust-pages.spec.ts`：四页正文/页脚/邮箱/无表单/窄屏/指南/键盘入口验证。
- `docs/release/adsense-readiness.md`、`docs/release/nginx-static.example.conf`：后续 AdSense、根域/TLS、静态托管和真实 404 的具体操作准备。示例尚未执行 nginx -t 或加载，需核实实际目录、证书及现有配置。

## 实际验证结果

| 检查 | 结果 |
| --- | --- |
| npm run type-check | 通过 |
| npm run test:vitest | 18 文件、186 项通过 |
| npm run build:csr | 通过；不当作预渲染或部署 |
| npm run build-only | SSG 构建通过，精确 15 HTML |
| npm run test:ssg | 2 文件、3 项通过 |
| npm run test:inventory | 154 身份、原始源 SHA、唯一 owner 及负向夹具通过 |
| node scripts/check-adsense-readiness.mjs | 15 HTML、60 个页脚链接、7 指南；无 AdSense 执行代码及 ads.txt |
| node scripts/e2e-run.mjs chromium webkit | 274/274 通过，无失败/跳过；构建/测试退出 0，源/测试/配置/锁/产物一致性及端口释放通过 |
| git diff --check、文档相对链接 | 通过 |

浏览器覆盖新增四页及 375/768/1440px 布局、无 JS 静态页面、导航、原工具、复制/清空、2FA 隔离、真实本地 404。Firefox 在前一轮已确认本机启动失败，本轮未重复该失败，也未宣称 Firefox 通过；Chrome/Edge/Firefox/Safari 当前和前一稳定版人工矩阵未全部验证。

最终 E2E 证据：[运行结果](evidence/m106c3/runs/2026-11-03T12-30-59.623Z-5364/run.json)、[测试明细](evidence/m106c3/runs/2026-11-03T12-30-59.623Z-5364/results.json)、[来源与产物摘要](evidence/m106c3/runs/2026-11-03T12-30-59.623Z-5364/build-sha256.json)。其他本地日志见 `evidence/adsense-readiness/`。

## 公网只读检查与未完成项

证据：[公网检查](evidence/adsense-readiness/public-checks.json)。本轮未更改公网内容：

- www HTTPS 首页、关于、隐私返回 200，TLS 校验通过。
- HTTP www 返回 301，目标为 https://www.v7luck.com/。
- 根域 v7luck.com 本次无法解析（curl exit 6），域名控制权未验证；需由实际 DNS/注册商管理方核对。
- 随机不存在路径返回 HTTP 200，属于软 404；已提供 Nginx SSG 静态站点示例，尚未修正远端。
- 未核验 AdSense 账号/站点 Ready 状态，未提供发布商 ID、未生成 ads.txt、未加载广告、未配置 CMP；不保证获批或收入。
- 正式发布、两新页索引白名单、运营主体/适用地区信息及服务条款最终审阅仍需负责人处理，不将本地完成称为 Release Ready。

## 需求追溯

ADS-01～04 对应四页面和静态/浏览器正文验证；ADS-05 对应页脚、路由及窄屏/键盘 E2E；ADS-06 对应七份指南和静态审计；ADS-07 对应公网只读记录及明确未完成项；ADS-08 对应准备配置和无广告审计；ADS-09 对应 noindex 路由元数据、未变更的正式索引清单及接入清单。


## 继续推进：生产候选与移交（2026-11-03）

负责人要求“继续往下推动”。本轮继续本地生产候选与发布包验证，17 项生产/preview 隔离及篡改拒绝检查通过；同一生产候选经 Chromium/WebKit 84 次页面检查及静态正文/SEO/404/核心转换验证通过。已生成只包含 54 个公开静态文件的归档，并逐文件核对 manifest 大小与 SHA，未部署。

具体包 ID、独立 SHA、验证证据和上线前信息见[生产移交材料](../release/adsense-handoff-2026-11-03.md)。没有修改业务代码或索引清单，没有把上一轮回归结果宣称本轮重跑。线上根域 DNS 和软 404 未修复，T07 负责人审阅和独立发布授权仍未完成。

## 负责人发布后公网复验（2026-11-03）

负责人自行完成发布并要求重新验证。公网 54 文件与生产包逐文件摘要一致；已知页面恢复 200，SSG 正文、真实 404、生产 SEO 及两引擎核心行为验证通过。根域 DNS 与 HTML 缓存/HSTS 统一仍待处理；详情见[发布后验证](014-publication-check.md)。未由代理操作服务器或启用广告，未将此结果等同 Google 审核通过。
