# 035 SEO 与功能推广

日期：2026-11-08。负责人要求“优化seo，方便搜索引擎采集和功能推广，提示排序”。本轮先确立以下范围后实施；“提示排序”暂按提升自然搜索表现及优化站内推荐顺序处理，不承诺搜索名次。当前20工具、27站点页面加404，保留既有未提交实现。

## 目标与需求

| 编号 | 需求与可执行验收 |
| --- | --- |
| SEO-01 | production允许索引的显式白名单由8扩至24：19个工具加首页/办公目录/开发目录/关于/隐私；2FA、联系、条款及404继续noindex。local/preview全部noindex且无canonical/生产站点地图。不得将敏感页面索引与允许第三方脚本混同 |
| SEO-02 | 24页各有唯一准确title/description及自引用HTTPS canonical，首个要素为功能用途，描述含实际支持格式/限制；Word明确仅DOCX简版重排打印，不伪称完整Word保真转换。28HTML、20工具和算法不变 |
| SEO-03 | production sitemap恰含24个canonical，无query/hash/别名、虚构lastmod/priority；robots引用唯一www sitemap。不扩大origin、不改DNS/服务器 |
| SEO-04 | 首页和分类说明覆盖当前PDF、图片、文本、开发工具及本地处理能力；保留可见精简首屏、20个可抓取href入口、原创工具指南，不添加门页、隐藏关键词或重复推广卡片 |
| SEO-05 | 首页和分类按明确的用途推广顺序展示，不再按开发时间倒序。办公优先图片压缩、PDF合并/拆分、图片转PDF、裁剪；开发优先JSON、时间戳、Base64。搜索保留原有筛选行为与该顺序；未知工具置末，排序不改变调用方数组；顺序为产品判断，不伪称热度/搜索量或外部排名 |
| SEO-06 | production首页生成真实WebSite标记；获准分类/工具页生成与可见路径一致的BreadcrumbList。SSR与客户端共用纯模型，单一JSON-LD节点、JSON安全转义、导航到404/preview时清除。无虚构评分、FAQ富结果承诺、站内搜索Action或不可见内容 |
| SEO-07 | 不改变本地输入、敏感独立文档/统计隔离、路由/404与预览保护，不引入依赖/新统计/存储；错误配置、遗漏白名单、重复schema/SEO标签及错误sitemap必须被检查拒绝 |
| SEO-08 | 类型、模型/DOM、preview静态、隔离production候选/打包故障测试及真实双引擎回归记录实际结果，验证禁JS正文与hydration一致。发布指南包含上线后HTTP、canonical、sitemap和Search Console观测步骤；不把本地测试或建议称已收录/排名提升 |

## 排除与授权边界

不部署、不操作远端、Search Console/百度站长/Bing账号或提交URL；不新增分析统计、广告、付费推广、购买外链、评论评分、内容上传或依赖。隔离production模式只用于本地验收，不替换根dist或提供正式移交包。线上索引与排名须发布后实际观测。

本轮替代历史“仅8页正式索引”限制的SEO清单部分；原敏感文档隔离与026无重复相关工具卡片要求保留。无需新增路由/SSR架构决策，沿用现有SSG。

## 官方依据

查阅日期2026-11-08：[Google SEO入门](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)、[noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)、[站点地图](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)、[可抓取链接](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)、[面包屑结构化数据](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)。实现基于清晰内容和可抓取规范URL，不保证收录、富结果或排名。软件应用富结果要求真实评分/评论，本项目不编造该信息，首版不输出该类型。
