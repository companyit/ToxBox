# 036 图片工具资源加载优化

日期：2026-11-08。负责人要求继续其他方面的优化，本轮在读取当前资源和依赖后选择有实际证据的图片工具性能优化，不新增工具或依赖。

## 当前事实

035最终构建中，imageConvert共享主线程JS为421835字节，imageCrop Worker为429086字节，imageConvert Worker为525596字节。SSR manifest显示`src/utils/imageConvert.ts`通过`imagePdf.ts`连入`pdf-lib/es/api/PDFDocument.js`；图片压缩与裁剪不生成PDF，却承担该依赖。以上为本地未压缩构建体积，不能称真实用户网络耗时或Core Web Vitals。

| 编号 | 需求与验收 |
| --- | --- |
| PERF-01 | 将现有JPG/PNG头部、CRC、EXIF方向与像素校验逐字迁移至纯模块，不引入PDF/ZIP/Canvas依赖；imagePdf保留原inspectImage/ImageInfo导出兼容，PDF生成与图片转PDF行为不变 |
| PERF-02 | imageConvert改为只依赖该纯校验模块。图片主线程共享校验JS不超过32KiB，crop Worker不超过32KiB，convert Worker不超过160KiB（均未压缩）；保留实际前后字节/gzip对比，不将gzip估值当实际传输大小 |
| PERF-03 | 浏览器冷上下文直达图片转换/裁剪页，实际请求的本地JS体积显著下降；选择自制图片后仍以同源Worker执行，不加载PDF渲染资源或外部请求。保留资源清单与浏览器版本，不设无证据的秒级速度承诺 |
| PERF-04 | 不改变格式支持、EXIF、透明/JPG白底、固定坐标/比例、大小保护、错误中文及取消/迟到消息/离页资源清理。原有图片与文档单元/组件、真实Worker及全站回归通过 |
| PERF-05 | 不改变20工具/28HTML/20指南、035正式24页索引、preview保护、敏感独立文档/无统计边界及站内排序。类型、构建、静态及production候选验收记录实际结果 |
| PERF-06 | 新增有用的资源体积回归检查，预算失败应拒绝；文档记录源码/产物摘要和未覆盖矩阵，不把本机体积下降当真实手机、线上CDN或Core Web Vitals达标 |

## 排除与授权

保留用户现有未提交成果。只复用现有工具链做本地优化，不新增依赖、持久化、上传、统计、算法能力、路由、缓存策略或预加载架构；不执行正式移交、远端操作或部署。真实设备/读屏、Firefox和线上性能观测仍独立待验收。
