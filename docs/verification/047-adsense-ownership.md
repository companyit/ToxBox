# 047 AdSense 所有权元标记验证

日期：2026-11-14（Asia/Shanghai）。基线HEAD `40aa4bf`加已有044/045实现与046/047文档等工作区变更，未覆盖已有成果。负责人在具体元标记方案后回复“开动”，按[047规格](../specs/047-adsense-ownership/spec.md) OWN-01～04实施，不部署或操作Google后台。

## 行为与文件

- config/adsense-readiness.json：真实publisherId、verificationMethod=meta-home，adScriptEnabled仍false、adsTxtConfigured仍false。
- src/utils/seo.ts：PageHead包含可选adsenseAccount，仅正式批准origin首页生成；applyPageHead去重并在其他页面/preview清除。
- scripts/ssg.mjs：正式候选首页head生成唯一静态meta；接入scripts/adsense-ownership.mjs完整文档校验，缺失/重复/错ID/错页/广告执行脚本或广告位均拒绝。
- scripts/check-adsense-readiness.mjs：默认preview、支持production及显式仓库内产物目录；校验对应模式的唯一标记，继续禁止广告脚本/ads.txt/广告位和未批准发布商ID。生产及preview分别审计自己的资源目录，不只检查preview资源。
- 单元/DOM/静态/生产双引擎测试与014/047、ADR-040、产品进度、发布步骤同步。index.html、依赖/锁、业务算法及正式dist未修改。

## 实际执行

| 检查 | 结果 |
| --- | --- |
| npm run type-check / npm run build:preview | 类型通过，生成29HTML；preview全页无验证标记，Vite既有未来configLoader导入扩展名提醒保留 |
| npm run test:vitest | 51文件372项通过；本轮新增1项模型、2项DOM/审计测试；内部循环不另计 |
| npm run test:ssg | 17文件19项通过；preview29页无标记断言保留 |
| npm run test:inventory | 154项历史身份/原文件SHA/唯一owner/发现目录及负向夹具通过，不计新增业务测试 |
| node --test tests/release/seo-growth.test.mjs | 5项通过、无失败/跳过；含生产候选、原SEO负向、所有权负向与Chromium/WebKit各29页SSR/head接管及首页到办公导航清理。29页循环不是额外58项测试 |
| 广告准备审计preview / production隔离候选 | 两者退出0，各29HTML、116页脚检查、21指南；广告仍关闭，domainOwnership及adsenseApproval均未验证 |

生产测试保留既有错canonical、重复JSON-LD、缺sitemap断言，新增缺meta、重复meta、错ID和敏感页带meta的候选拒绝；DOM测试另覆盖body中meta、广告脚本与广告位拒绝。测试浏览器拦截所有非本地请求，实际外部请求列表为空，不访问广告服务或Google账号。

## 证据及限制

[preview构建](evidence/adsense-ownership-2026-11-14/preview-build.log)、[静态](evidence/adsense-ownership-2026-11-14/ssg.log)、[身份核对](evidence/adsense-ownership-2026-11-14/inventory.log)、[生产测试](evidence/adsense-ownership-2026-11-14/production.log)、[preview审计](evidence/adsense-ownership-2026-11-14/preview-audit.json)、[production审计](evidence/adsense-ownership-2026-11-14/production-audit.json)。隔离候选ID为seo-1794636325168；[候选收据引用](evidence/seo-growth/seo-1794636325168/candidate.json)、[29页及浏览器结果](evidence/seo-growth/seo-1794636325168/results.json)保留。本轮验证通过后仅追加文档报告，候选为测试样例，不作为最终正式发布包；正式交付须从最终源重新构建。

未执行全站562项工具行为回归、Firefox功能/真机/读屏、生产部署或公网复核；不引用045结果作为本轮重跑。Google后台所有权/网站审核未执行；本地标记正确不代表Google已验证。实际发布后需负责人在AdSense选择元标记验证；普通npm preview读取旧正式dist时不会自动包含本轮变更。文件翻译暂停、文件对比扩容未实施。
