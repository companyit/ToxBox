# 037 标准构建缺失新增功能修复

日期：2026-11-08。负责人反馈`npm run build`后无法使用新增功能，本轮修正命令与产物目录，不新增功能或依赖，不执行Git写操作、远端或部署。

## 原因与行为变化

修复前实际读取：dist仅1个旧HTML，标题仍是旧首页文案，没有裁剪页和静态工具目录；dist-ssg已有28HTML/20个目录卡片。原build只更新dist-ssg，普通检查/上传dist会继续得到旧版本。原preview中间件又写死dist-ssg，即使传入其他outDir，也可能用旧目录HTML搭配另一目录资源。

本轮统一约定：

| 命令 | 当前行为 |
| --- | --- |
| `npm run build` | 复用既有正式门禁，类型检查、production SSG、包/归档校验、备份及切换完整dist |
| `npm run build-only`、`npm run build:release` | 完整生产构建同义入口；build-only保留兼容，但不跳过类型/包检查 |
| `npm run preview` | 通过HTTP提供同一份dist；默认中间件读取实际outDir，robots/sitemap/许可证按当前目录静态提供 |
| `npm run build:preview`、`build:preview-only` | 原noindex SSG链路，前者含类型检查，输出dist-ssg |
| `npm run preview:local` | 提供独立dist-ssg，供noindex测试及人工预览 |
| `npm run build:csr` | 显式CSR实验，仅写dist-csr，不再覆盖完整生产dist |

Playwright webServer、e2e runner、CI的构建命令及本地工作流检查器同步改用显式noindex入口。候选的严格路径/摘要验证分支保留，不把普通outDir能力套到受控候选上。

## 实际构建与产物

已实际执行标准build、兼容build-only以及CSR隔离构建，退出0；补齐生产预览SEO文件响应后再次执行标准build成功。最新正式本地产物ID：`toolhug-20261108135426801-7c157f67`。

- dist：299个公开文件、28HTML、20工具、24canonical/sitemap、4noindex和188PDF资源，目录/摘要与包site全等。
- 归档：`.ci/handoff/toolhug-20261108135426801-7c157f67/toolhug-20261108135426801-7c157f67-site.tar.gz`。
- 独立SHA256核对：`7113683844319b50d798d6ef864cde4152dd6d06d01cbbcd661ab48eb47a75d4`。
- 原单页dist保留在首次成功构建的`.ci/handoff/toolhug-20261108134752398-f94d7979/previous-dist`，未删除用户旧产物；后续切换也保留previous-dist。
- 实际CSR构建前后，dist文件集合及SHA完全相同；dist-csr仅1HTML，隔离有效。

结果见[产物独立核对](evidence/build-entry/artifact-checks.json)。构建成功是本地打包完成，不是上线。

## 验收

| 检查 | 结果 |
| --- | --- |
| 标准build/build-only/CSR | 实际执行成功，dist完整、旧版本备份及CSR隔离核对通过 |
| 默认预览及目录回归 | 5项通过，包含两引擎真实新增Worker、noindex预览及自定义outDir |
| 默认preview新增功能 | Chromium与WebKit实际完成裁剪并下载、PDF缩略图/导出、JSON→YAML；无运行时/hydration错误及外部请求 |
| HTTP行为 | 默认首页等于dist原文件；裁剪已知路径308、未知404；robots/sitemap/许可证均200且字节与dist相等；自定义根的HTML/资源/404不串目录 |
| 单元/组件与静态 | 332项及18项通过 |
| 历史身份审计 | 154项映射/摘要/owner和负向检查通过，不是154项新增功能测试 |
| CI本地检查 | YAML、3任务、37表达式、官方SHA/权限及bash语法通过；没有触发远端CI |
| 显式noindex全站双引擎 | Chromium/WebKit共522项通过；构建/源/测试/配置/锁/产物绑定和端口释放检查通过 |

默认预览实际任务与来源见[结果](evidence/build-entry/toolhug-20261108135426801-7c157f67/results.json)，本地CI检查见[日志](evidence/build-entry/ci-check.log)。默认预览是production文件的本地HTTP查看，因此有正式SEO标签；名为preview的命令不等于构建期preview模式。自动化noindex检查继续使用明确的build:preview/preview:local，不混用。

最终noindex[run.json](evidence/m106c3/runs/2026-11-08T13-56-07.115Z-9135/run.json)、[结果明细](evidence/m106c3/runs/2026-11-08T13-56-07.115Z-9135/results.json)及[构建摘要](evidence/m106c3/runs/2026-11-08T13-56-07.115Z-9135/build-sha256.json)绑定本轮测试链路。HEAD为`8a8e89cf96c9aef521981180a49db26151d91298`，改动仍在工作区，未写入Git。入口及构建原始日志与计数见[汇总](evidence/build-entry/summary.json)。

## 过程与限制

初轮完整noindex回归在122项通过后主动中止：补查发现旧中间件还将robots/sitemap作为未知页处理，扩充静态公开文件的透传并增加真实HTTP断言后重建重跑。中止记录不作为全量通过或失败豁免。

[README](../../README.md)与[发布指南](../release/runbook.md)已更新；使用终端显示的HTTP地址查看，不以file://打开HTML代替Worker/模块验收。真实托管、根域名/缓存配置、负责人/真机/读屏及系统保存仍待独立验收；Firefox环境问题保留。旧阶段build输出dist-ssg、preview默认noindex的描述是历史，当前操作以037为准。未部署，未提交搜索平台。
