# 033 PDF 页面整理：本地实现与验证

后续状态：空白缩略图错误已修复，实际解码补验及最新502项回归见[后续报告](033-pdf-organizer-followup.md)。本文490项等为首版交付阶段证据，不能替代后续源码结果。

日期：2026-11-07。负责人在原型报告及完整工具剩余项说明后回复“继续”，本轮完成ORG-01～10首版本地实现及自动化验收。关联[规格](../specs/033-pdf-organizer/spec.md)、[设计](../specs/033-pdf-organizer/design.md)、[任务](../specs/033-pdf-organizer/tasks.md)。未执行生产候选、正式打包或部署。

## 实现范围

新增`/office/pdf-organizer/`：单份非空PDF，20 MiB、1～100页；严格检查后查看缩略图，用拖动或前移/后移按钮排序、逐页顺逆时针90°旋转、删除及确认恢复原始排列，至少保留一页。主动导出organized.pdf，输出上限100 MiB。导出复制原页并叠加原旋转，保留普通文字、图片及页面尺寸，不把缩略图栅格化进PDF。

纯TS计划位于`src/utils/pdfOrganizerPlan.ts`，严格解析与导出位于`pdfOrganizer.ts`及独立Worker；`pdfPreview.ts`管理PDF.js会话、2并发、最长边320像素、最多24项LRU缓存、10秒保护、取消和Blob URL释放；页面组件负责文件/编辑/焦点/恢复确认及30秒检查与导出保护。两个解析器核对页数、CropBox/MediaBox交集及原旋转后才允许导出。重选/编辑使旧下载失效，过期任务不回写；清空/pagehide/离页释放文件与任务。预览页面解析在Worker，Canvas绘制在主线程，不宣称全部计算位于Worker。

首页/办公目录/搜索/面包屑/页头/原创指南/隐私及敏感独立文档边界已接入；相关工具通过现有办公分类目录发现，沿用既有UI清理，不恢复全站重复入口。新增页noindex，正式八页索引不变，无GA/广告，不上传或持久化内容。本轮无新增依赖，复用此前获准的pdfjs-dist@6.5.438与pdf-lib@1.17.1。

当前工作区目录共19工具（办公12/开发7）、26站点页加404，共27HTML、19指南。数量包含此前已接入的文本工作台；本报告只验收033，不代签其他规格任务。

## 资源与静态构建

`scripts/pdf-resources.mjs`按已安装批准版本读取精确188个CMap/字体/ICC/图像解码资源，Vite插件输出同源pdf-assets目录；不分发QuickJS资源。候选输出校验将集合、大小和SHA256逐项与该版本安装资源比对，拒绝任意额外文件；新增对应MIME。只在浏览器选择文件后动态导入PDF.js，SSG空表单渲染不求值PDF.js，服务端包不公开。此资源核验依赖已核验的本地安装包，不等同另一次供应链或漏洞审计。

静态预览语义检查通过，包括188项资源；负向副本中缺失openjpeg.wasm、篡改CMap、额外QuickJS和额外CMap四类均被拒绝，见[负向结果](evidence/pdf-organizer/resource-negative.json)。原型曾验证不含unsafe-eval的CSP，本轮不将其宣称为已部署的站点响应头。

## 实际验证

| 检查 | 结果 |
| --- | --- |
| npm run type-check / npm run build | 通过，应用与测试类型及CSR/SSG构建退出0 |
| npm run test:vitest | 41文件、317项通过 |
| npm run test:ssg | 13文件、15项通过，27HTML |
| npm run test:inventory | 154项历史身份/摘要/owner及负向检查通过；不是额外154项功能测试 |
| Chromium + WebKit完整回归 | 490项全部通过，构建/测试均退出0，249.316秒，端口释放 |
| 广告准备审计 | 27HTML、108页脚链接、19指南通过，广告关闭 |
| 资源语义及四类负向检查 | 全部符合预期，未放宽任意文件通过 |
| PDFKit独立渲染/文本检查 | 实际下载的五页文件页序5/1/3/4/6，旋转270/0/180/180/0；普通文本及嵌入Type3字形“工”的Unicode映射可提取，五页可独立渲染 |
| git diff --check | 通过 |

最终浏览器运行：[run.json](evidence/m106c3/runs/2026-11-07T11-46-29.580Z-5267/run.json)，同目录build-sha256.json绑定源、测试、配置、锁及最终SSG摘要；[补充摘要](evidence/pdf-organizer/verification-summary.json)记录资源脚本/配置、归档证据与PDFKit结果。

033的10次浏览器检查包含在490项中：两引擎三视口真实拖动/键盘移动、原旋转叠加、删除、恢复确认、下载后重新解析页序/旋转/尺寸、编辑撤销下载、清空回焦、无外发/pageerror；另验证独立文档导航、单页保护、101页/损坏拒绝、pagehide，以及100页滚动、末页懒加载、缓存URL始终不超过24且清空归零。组件替身另覆盖取消、迟到消息、30秒超时、URL失败和编辑保留，不将替身作为PDF算法证据。

纯算法覆盖页码唯一性、范围/旋转、空计划、20 MiB边界、100/101页、AcroForm拒绝，导出用六页合成源验证不同原旋转与CropBox。嵌入字体样例为自行构造的Type3单字形，不宣称覆盖全部CJK字体、CID字体或复杂出版文档。此前原型中文扫描图像证据仍见[原型报告](033-pdf-preview-prototype.md)。

## 失败修复与视觉证据

首次测试发现新增工具相关数量与迁移身份选择列表未更新，以及新增测试的语法/空值类型问题，已修复。首次全量回归发现旧PDF搜索数量4应为5，以及跨滚动区域简化拖动调用未启动正确拖动；保留失败和中断记录，不计为通过。修复中增加明确拖动手柄及拖动载荷，固定320px预览区域防止图片加载造成布局跳动；测试采用真实鼠标先启动拖动再滚动至目标，并等待源页就绪。WebKit导航检查改为等待整页加载后检查挂载。最终定向10项与完整490项均通过，无豁免。

已查看[375px页面](evidence/pdf-organizer/width-375.png)、[1440px页面](evidence/pdf-organizer/width-1440.png)及PDFKit五页独立渲染，实际页序、方向及内容可见，无页面横向溢出。全页截图保留滚动时常驻导航位置，不将其当成真实手机或视觉负责人签收。

[合成下载文件](evidence/pdf-organizer/organized-synthetic.pdf)；PDFKit渲染：[第1页](evidence/pdf-organizer/pdfkit-page-1.png)、[第2页](evidence/pdf-organizer/pdfkit-page-2.png)、[第3页](evidence/pdf-organizer/pdfkit-page-3.png)、[第4页](evidence/pdf-organizer/pdfkit-page-4.png)、[第5页](evidence/pdf-organizer/pdfkit-page-5.png)。全部样例为合成内容，无真实用户文档。

## 未完成与限制

负责人视觉/行为签收、真实手机/读屏、系统下载落盘及更多阅读器尚未完成。Firefox仍有既有启动环境缺口；复杂CJK/CMap、ICC、JPX/JBIG2实际解码、超大图片/最大规模内存与输出100 MiB压力矩阵未全面覆盖。保护数值不是性能或内存安全保证。不承诺书签、签名、附件、链接目标、标签保真或安全清洗。

既有依赖审计8项告警（7中危/1高危）未在本轮升级修复，不能称整个项目安全审计通过。GitHub远端CI、分支保护与公网状态未核验。本轮只更新本地dist-ssg，不更新正式dist、生产包或服务器；工作区大量既有未提交内容保留，不能用HEAD单独代表当前成果。
