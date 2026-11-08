# SEO上线核对与推广顺序

日期：2026-11-08。对应[035规格](../specs/035-seo-growth/spec.md)。这是本地SEO能力及后续执行指南，不代表已经部署、提交搜索平台或提升名次。

## 本轮已实现的索引政策

正式origin保持`https://www.v7luck.com`。production模式的24个canonical为19工具加首页、办公目录、开发目录、关于和隐私；2FA、联系、条款和404不索引。具体清单以`src/data/indexing.ts`及`config/site-release.json`一致性校验为准。敏感文档工具即使可索引，仍不加载第三方脚本；公开的只是静态说明和空界面，输入不写入HTML或URL。

默认`npm run build`/`npm run preview`仍为noindex预览，不能把`dist-ssg`当生产包上传。正式打包/部署与账号操作需要另行授权，本轮只使用隔离production候选测试。

## 站内展示及推广优先级

以下为用途清晰度、功能完成度和站内组合能力的产品判断，尚无Search Console搜索量/转化数据，不标“热门”或承诺搜索名次。首页、分类、搜索结果共用这一顺序；搜索词只在本地筛选。

| 顺序 | 办公工具 | 推广角度与限制 |
| --- | --- | --- |
| 1 | 图片压缩与格式转换 | JPG/PNG/WebP、等比缩小、体积比较；不承诺总能变小或WebP跨浏览器可用 |
| 2 | PDF合并 | 本地合并、文件排序、免上传；保留文档兼容限制 |
| 3 | PDF拆分与选页 | 选指定页、逐页拆分，说明实际页序规则 |
| 4 | 图片转PDF | JPG/PNG按序生成A4文档；方向、边距和透明白底说明 |
| 5 | 图片尺寸与裁剪 | 原像素坐标、固定比例、只等比缩小；PNG透明/JPG白底 |
| 6 | PDF页面整理 | 缩略图排序、旋转与删除；预览失败不代表空白页 |
| 7～13 | 文本统计、文本整理、文本差异、CSV/JSON、日期计算、文本工作台、Word转PDF | 用合成样例解释规则。Word只推广DOCX简版重排及打印另存，不称保真、旧DOC转换或直接生成PDF |

| 顺序 | 开发者工具 | 推广角度 |
| --- | --- | --- |
| 1 | JSON格式化与校验 | 缩进/压缩/语法校验，准确数字精度限制 |
| 2 | 时间戳转换 | 秒/毫秒、UTC与固定UTC+08:00，明确时区语义 |
| 3 | Base64 | UTF-8中文文本互转，不称加密 |
| 4 | JSON/YAML | JSON兼容数据转换，公开拒绝别名/重复键等限制 |
| 5 | URL编解码 | 区分URI组件/完整URI及加号行为 |
| 6 | UUID | UUID v4批量生成，不承诺绝对唯一 |
| 7 | 2FA | 保留站内入口，首轮不扩入搜索索引；不使用真实密钥做推广素材 |

可在自有介绍材料中分享工具规范URL，并用自制样例说明“输入→步骤→结果”，不得携带用户输入/文件名/密钥的query/hash。保留清晰原创指南，不添加重复卡片、隐藏关键词、虚构评论/评分或承诺排名；本轮未向外部渠道发送或发布推广内容。

## 获准上线后按顺序检查

1. 确认发布包来自production构建并通过独立摘要校验，而不是默认preview目录。源版本、包ID、manifest SHA与本轮验证须有可追溯记录。
2. 用原始HTTP响应检查首页、两分类、19索引工具和关于/隐私：200、唯一title/description/canonical，HTML及响应头不含冲突noindex；同时检查hydration后head与原始一致。排除页面保持noindex，未知路径真实404；已知无尾斜杠跳转，query/hash不进入canonical。
3. 取实际`/robots.txt`和`/sitemap.xml`：均200、MIME正确、无登录/访问拦截，robots引用唯一www sitemap，XML恰为24个唯一规范URL。检查X-Robots-Tag/CDN缓存是否覆盖了新HTML，不能仅凭本地文件推定线上生效。
4. 保留188个PDF资源实际MIME/缓存及JS/CSS加载检查、HTTPS www/根域名跳转检查；SEO变更不替代原发布门槛。
5. 负责人在Google Search Console验证域名所有权后提交该sitemap；用URL检查查看首页、两个分类、图片压缩、PDF合并及JSON工具的抓取/索引状态。有账号授权时再人工操作，本轮未连接账号、上传验证文件或提交URL。若使用其他搜索平台，分别核验其官方流程及记录，不假设Google提交会同步。
6. 上线后按周记录规范页的发现/抓取/索引状态、展示量、点击、CTR、平均排名与查询词；用同一页面及时间范围比较，低数据量标记不足。优先处理“无法抓取/仍noindex/错误canonical”，再根据真实查询补充用户需要的说明，而非盲目增加关键词。未获授权不增加新的站内采集代码。

## 本轮证据及边界

本地生产候选可证明生成合同，不能证明真实Googlebot或托管行为。2026-11-08尝试通过浏览工具查看公开首页/robots/sitemap，工具报告无法访问，不能据此判定网站宕机或抓取失败；没有新的公网核验结果。Firefox、负责人视觉/真机/读屏和真实系统保存仍按已有验收清单处理。

## 官方依据

- [Google SEO入门](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)：清晰且有用的原创内容、准确标题和摘要。
- [noindex规则](https://developers.google.com/search/docs/crawling-indexing/block-indexing)：noindex会阻止进入搜索结果，robots禁止抓取不能替代该指令。
- [站点地图说明](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)：辅助发现URL，不保证抓取或收录。
- [可抓取链接](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)：真实href与描述性链接文字。
- [面包屑结构化数据](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)：与可见路径一致，标记不保证富结果展示。
