# 036 设计

[规格](spec.md)、[任务](tasks.md)。

新增`src/utils/imageInspect.ts`承载原imagePdf中的ImageInfo、invalid、exifOrientation和inspectImage，仅依赖crc32及imagePdfLimits。原函数体保持逐字一致，旧imagePdf通过import+export保留兼容并继续使用同一函数；PDFDocument和processImages/imagePlacement仍留原文件。imageConvert只改该import来源，现有页面和Worker不改算法。

在改动前冻结本地构建字节、gzip、manifest中的模块归属以及两个浏览器实际请求清单；复用既有预览服务、选择合成80×40PNG并执行转换/裁剪，分别记录初始加载/任务后的JS响应体字节。采样用独立脚本，不做用户内容埋点或存储；JS body计数来自本地响应，不作为真实传输大小、吞吐或Core Web Vitals。

静态检查通过manifest定位图片共享校验chunk及两个Worker（而非锁hash文件名），验证预算与主线程校验chunk未混入pdf-lib；保留原有PDF Worker所需依赖。算法回归沿用既有真实输入边界/EXIF1～8及图片转PDF/PDF处理，增加兼容导出与资源失败负向检查，避免用仅检查代码字符串的测试代替行为。

完成类型/构建、单元组件/静态、production候选及默认preview双引擎验收，再记录实际体积与限制。没有真机、网络整形/CPU节流或线上数据时，不给出速度提升百分比或LCP/INP/CLS达标结论。
