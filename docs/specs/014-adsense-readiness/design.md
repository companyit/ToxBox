# 014 设计

日期：2026-11-03。实施范围依据负责人的页面/内容/接入前配置确认，不包含广告执行代码。

## 模块与数据流

`src/data/site.ts` 集中声明公开邮箱及站点名称，Contact 页面复用。Contact/Terms 使用现有静态页面模式接入 pages/routes，沿用 HTML5 History、SSG 和无障碍导航。页脚增加四入口，更新已有 About/Privacy 事实性文字。

`src/data/toolGuides.ts` 为七个 ToolPageName 提供独立原创指南，复用 ToolPageLayout 输出步骤、示例解读、注意事项和问答；只读内容，无输入、请求、追踪或持久化。原工具组件和算法不变。指南置于工具之后，保留既有工具操作路径。

`config/adsense-readiness.json` 声明准备状态、正式 origin、联系邮箱、广告关闭、未提供 ID 与 2FA 排除路径。`scripts/check-adsense-readiness.mjs` 使用现有 Node 原生 API 和实际 SSG 产物，校验配置、站点页面、四导航及指南存在，拒绝虚构 ID/广告脚本/ads.txt。检查通过表示本地准备状态，不声称域名、HTTPS、Google 审核或法务已通过。无新 npm 依赖。

## SEO 与构建

新增两页后精确 14 个站点页面 + 404（15 HTML）；更新现有 SSG、路由单元测试及 E2E 产物清单，不放松断言。Contact/Terms noindex，既有八条正式索引清单不变。`build:csr` 仍为 CSR，AdSense 公开审阅建议使用获得独立发布授权后的 SSG 产物。

## 异常与验证

邮箱为可见文本与 mailto 链接，不在脚本中提交邮件；用户选择发送后由邮件服务处理。正文使用 Vue 文本和语义化 HTML，不插入任意 HTML，不写虚假运营身份。

运行类型检查、Vitest、CSR/SSG 构建、SSG 产物检查、历史身份清单、接入前审计，以及 Chromium/WebKit 页面/页脚/指南/工具回归。Firefox 已有启动环境限制需实际尝试并如实记录，历史通过不视为本轮验证。

域名只读请求保留证书验证，不使用 `-k`，核验返回状态、最终 URL、重定向和真实 404；失败区分本地网络限制与远端异常。用户未授权购买、变更 DNS、签发证书或发布，文档只提供具体执行准备。

关联：[规格](spec.md)、[任务](tasks.md)。
