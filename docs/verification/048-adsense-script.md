# 048 AdSense 广告脚本接入验证

日期：2026-11-14（Asia/Shanghai）。基线HEAD `40aa4bf`加已有044/045/047等工作区变更。负责人明确要求“开启广告，为了接入adsense”，按[048规格](../specs/048-adsense-script/spec.md)实施，不部署或操作Google后台。文件翻译暂停，文件对比扩容未实施。

## 行为与文件

配置stage=integration、adScriptEnabled=true，白名单仅 /、/office/、/developer/、/about/；发布商ID保持ca-pub-2420716265318225。src/utils/adsense.ts集中判断环境/路径/开关和文档边界；seo.ts模型及SSG生成带async/crossorigin=anonymous的唯一精确加载器，保留047首页元标记。客户端接管复用已有script，广告组内导航不重复插入。

生产路由以原始文档路径判断广告组，跨组location.assign完整导航，原敏感组隔离保持。所有工具页/隐私/联系/条款/404均无广告加载器；preview模式构建全无广告。正式production产物本地预览会保留实际加载器，不将命令npm run preview误解为无广告测试构建。

广告/候选审计仅放行4页精确加载器，属性缺失、重复、错ID或工具页注入拒绝，其他资源限制保持。没有新增手工广告位、adsbygoogle.push、ads.txt、CMP、依赖或后端。PrivacyPage同步Google请求/Cookie/第三方数据披露和工具隔离，014/047旧关闭描述由048追加更新。配置开关或代码不证明Google审核/实际广告展示或同意配置完成。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| npm run test:vitest | 51文件374项通过，本轮新增1项白名单/开关/导航模型、1项加载器DOM复用测试；内部循环不另计 |
| npm run build:preview | 类型及29HTML preview构建通过；末轮隐私文案澄清production本地预览后重新生成preview |
| npm run test:ssg | 17文件19项通过 |
| npm run test:inventory | 154项历史身份/原文件SHA/唯一owner及负向夹具通过，不算新增业务测试 |
| node --test tests/release/seo-growth.test.mjs | 最终6项通过、无失败/跳过，含原SEO负向、所有权负向、加载器负向及两浏览器29页SSR/head接管与广告文档边界 |
| 本地标准npm run build | 首次通过，生成303文件/29HTML生产dist及现有流程移交归档；隐私句子澄清后最终构建另见后续实际记录 |

首轮Vitest372通过/2失败，发现404空路径错误归一为首页、DOM创建script未显式反射async属性；分别增加路径起始检查及setAttribute修复，最终374通过。首轮生产测试4通过/2失败（父测试包含子失败）：错误crossorigin已被拒绝，但校验器缺少固定中文诊断导致负向错误匹配失败，补充诊断后最终6通过；保留[首轮生产日志](evidence/adsense-script-2026-11-14/production-first.log)，未删除负向断言或将失败回填通过。

## 生产浏览器覆盖与边界

Chromium/WebKit各29页原始head和hydration一致，4页白名单、25页无加载器，只有首页验证meta。外部请求被拦截，对精确AdSense URL返回本地哨兵脚本，其他外部请求中止；没有从Google下载/执行真实广告代码或产生真实广告点击。

真实入口由首页进入JSON格式化和文件对比时，原脚本哨兵消失、无新广告请求；返回首页重新请求一次且哨兵=1，证明使用新文档。广告组内首页到分类保持单个加载器；原JSON工具到分类流程继续通过。没有把只删除script节点称为执行状态清理。

[最终生产日志](evidence/adsense-script-2026-11-14/production-final.log)、[候选记录](evidence/seo-growth/seo-1794637165202/candidate.json)、[29页及浏览器明细](evidence/seo-growth/seo-1794637165202/results.json)、[preview构建](evidence/adsense-script-2026-11-14/preview-build-final.log)、[静态](evidence/adsense-script-2026-11-14/ssg.log)、[身份核对](evidence/adsense-script-2026-11-14/inventory.log)、[preview审计](evidence/adsense-script-2026-11-14/preview-audit.json)、[生产审计](evidence/adsense-script-2026-11-14/production-audit.json)保留。生产浏览器测试后仅澄清隐私页关于正式文件本地预览的句子，再执行类型/preview/正式构建与产物审计；本轮不重复整站工具行为矩阵。

## 未完成

未部署或重新核验公网，Google后台站点审核、自动广告开关、真实广告展示/广告布局及地区CMP设置未验证；浏览器替身不能代替真实广告质量验收。Firefox已有profile启动失败本轮未修复/重跑，不声明三引擎通过。真实设备、读屏及系统交互签收仍待完成。当前四页白名单是本轮代码范围，后续广告单元、ads.txt、地区同意方案或扩大投放需记录具体范围。

负责人可按[接入清单](../release/adsense-readiness.md)在获准部署后核验线上原始HTML，并在AdSense后台核对账号/站点及自动广告设置。相关官方依据：[代码放置](https://support.google.com/adsense/answer/9274516?hl=en)、[自动广告](https://support.google.com/adsense/answer/9261307?hl=en)、[同意管理要求](https://support.google.com/adsense/answer/13554116?hl=en)。本地构建成功不等于Google审核获批。

## 最终本地产物

最终`npm run build`退出0，重新执行类型、生产候选语义、打包、归档解包一致性和dist安装校验；303文件、29HTML、24页索引、21工具/指南。正式dist仅4页有精确加载器，25页无广告，仅首页有验证meta，见[最终逐页与文件摘要](evidence/adsense-script-2026-11-14/dist-checks-final.json)、[最终生产审计](evidence/adsense-script-2026-11-14/production-audit-final.json)、[最终构建日志](evidence/adsense-script-2026-11-14/build-release-final.log)。末轮preview静态19项及审计再次通过，见[静态复验](evidence/adsense-script-2026-11-14/ssg-final.log)、[preview最终审计](evidence/adsense-script-2026-11-14/preview-audit-final.json)。[本轮源码摘要](evidence/adsense-script-2026-11-14/source-sha256.json)保留，依赖与锁文件无变化。

本地站点目录为仓库`dist/`，归档为`.ci/handoff/toolhug-20261114062325383-d0299b2b/toolhug-20261114062325383-d0299b2b-site.tar.gz`，SHA256 `1edddcf048a8bed55efae5ae5d3578ec1acf258c4f2d5e57079cd5b8862364bb`。构建按现有机制保留此前dist备份，未部署、未更改远端或Google账号。运行npm run preview会本地读取这份production dist，4页广告加载器仍存在；无广告测试预览应使用build:preview/preview:local。
