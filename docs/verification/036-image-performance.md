# 036 图片工具加载性能验证

日期：2026-11-08。负责人要求继续其他优化，本轮根据当前构建中的实际依赖问题，拆开图片文件校验与PDF生成。功能和算法规则不变，不新增依赖、工具、上传、存储或统计，未执行正式移交或部署。

## 问题与改动

035构建的SSR manifest显示，imageConvert通过imagePdf连入pdf-lib的PDFDocument等模块，造成图片转换/裁剪的主线程共享JS和Worker含不需要的PDF库。见[基线资源与模块归属](evidence/image-performance/before-sizes.json)。

新增`src/utils/imageInspect.ts`，只承载原JPG/PNG、CRC、EXIF和像素检查。类型及函数体与[原始快照](evidence/image-performance/original-inspection.txt)逐字一致；旧`imagePdf`导出保留同一函数引用，PDF生成和图片转PDF实现不变。`imageConvert`仅修改这一import来源，既有PNG/JPG/WebP规则和中文错误不变。

`scripts/image-resource-budget.mjs`定位实际manifest资源并检查32KiB共享脚本、32KiB裁剪Worker和160KiB转换Worker门槛及PDF库混入。默认SSG在发布本地产物前执行，隔离production/preview候选语义验证也执行；不是只在报告中记录一次数字。

## 实际体积

以下为同一Node/zlib level9统计的未压缩JS字节及gzip估值，不是线上传输字节或速度。

| 资源 | 改动前字节 | 改动后字节 | 未压缩体积下降 |
| --- | ---: | ---: | ---: |
| 主线程图片共享校验JS | 421835 | 1469 | 99.65% |
| 图片裁剪Worker | 429086 | 6727 | 98.43% |
| 图片转换Worker（保留ZIP能力） | 525596 | 103622 | 80.28% |

[改动后构建记录](evidence/image-performance/after-sizes.json)中，共享模块关联的pdf-lib模块数为0；所需PDF Worker仍保留其依赖，没有删除依赖包或能力。

## 两浏览器实际请求复核

Chromium/WebKit分别用独立上下文直达页面，等待hydration，再选择同一自制80×40PNG并完成转换或裁剪。没有向外部发送请求。统计本地JS响应体原字节，每次Worker请求分别计数，不按唯一文件去重；不是实际网络压缩传输、时延、吞吐或Core Web Vitals。

| 页面 | 首次页面JS响应体：前→后 | 完成任务后的累计JS响应体：前→后 |
| --- | ---: | ---: |
| 图片转换 | 604408→184042（下降69.55%） | 1130004→287664 |
| 图片裁剪 | 611661→191306（下降68.72%） | 1469833→204760 |

两引擎结果相同；版本、逐请求路径/状态和字节见[before](evidence/image-performance/before-requests.json)、[after](evidence/image-performance/after-requests.json)及[对比](evidence/image-performance/comparison.json)。复查入口为`node scripts/measure-image-loading.mjs before|after`，需空闲4177端口和已安装浏览器，使用当前本地构建，不会自动切换旧版本；复现before须使用原基线副本。

## 验证

| 检查 | 实际结果 |
| --- | --- |
| 类型及客户端/SSG构建 | 通过，实际资源预算检查通过 |
| 单元/组件 | 46文件、332项通过；兼容导出、错误语义、预算负向、原有图片边界保留 |
| 静态 | 16文件、18项通过，包括真实构建体积和PDF库混入检查 |
| 历史身份审计 | 154项映射/摘要/owner及负向夹具通过，不作新增154项功能测试 |
| production候选与交付链路 | 21项通过；24canonical/4noindex、结构化数据与两个引擎各28页SSR/hydration一致 |
| 最终preview双引擎 | Chromium/WebKit共522项通过，源码/测试/配置/锁/产物摘要绑定和端口释放检查通过 |

生产测试证据见[逐页记录](evidence/seo-growth/seo-1794132942041/results.json)和[候选身份](evidence/seo-growth/seo-1794132942041/candidate.json)，仅用于本地隔离验收。原20工具/28HTML/20指南及035索引、用途排序和敏感页面隔离保持。

最终[run.json](evidence/m106c3/runs/2026-11-08T10-16-26.746Z-3702/run.json)、[结果明细](evidence/m106c3/runs/2026-11-08T10-16-26.746Z-3702/results.json)和[构建摘要](evidence/m106c3/runs/2026-11-08T10-16-26.746Z-3702/build-sha256.json)绑定本轮工作区。HEAD为`e86985030c91e39b325341b6a89e44d1462e11fa`；实现未提交，不宣称该提交自身包含本轮改动。

[汇总](evidence/image-performance/summary.json)还核对纯校验类型/函数体迁移SHA完全一致，PDF排版和processImages原始函数体与原基线逐字一致。资源预算负向单元拒绝超限、零/非数值及混入PDF模块，实际构建门槛通过；无功能失败豁免。广告准备审计28HTML、112页脚链接、20指南通过，广告仍关闭。

## 限制与移交

本机两个浏览器的资源体积下降不能替代真实手机、网络/CPU节流、线上CDN缓存/压缩或Core Web Vitals观测；未声称页面耗时下降相同比例。Firefox环境故障、负责人视觉/读屏/系统保存和更广图像/文档矩阵继续按[20工具清单](local-review-20-tools-2026-11-08.md)待验收。既有依赖告警未处理或重审。工作区保留此前未提交成果，未执行Git写操作、远端设置、正式移交或部署。
