# 033 PDF 页面整理：缩略图原型验证

日期：2026-11-07。范围为安装后继续本地适配原型；不代表完整页面整理工具完成。关联[规格](../specs/033-pdf-organizer/spec.md)、[设计](../specs/033-pdf-organizer/design.md)、[任务](../specs/033-pdf-organizer/tasks.md)。

## 原型及实际结果

原型位于`scripts/prototypes/pdf-preview/`，使用独立Vite配置，产物位于`.ci/pdf-preview/site`，未改站点目录/入口/路由。PDF.js解析采用专用同源Worker，显示层主线程Canvas渲染；原页旋转加用户增量，最长边320像素。取消销毁loadingTask、PDFWorker及调用方拥有的原生Worker，清画布并隔离迟到消息。仅处理首页，不宣称已实现正式工具的队列/缓存。

| 检查 | 实际结果 |
| --- | --- |
| 原型独立严格TypeScript检查 | 退出0 |
| npm run type-check | 退出0；未运行全站功能回归 |
| 隔离原型Vite构建 | 退出0，Vite8.3.4；191文件，4,489,828字节，非站点生产包 |
| Chromium、WebKit真实浏览器 | 两引擎均完成13类原型检查，不等同26项独立测试用例 |
| 原始旋转与增量 | 六页合成源首页原旋转90°，预览320×213；增加90°后213×320，非空像素检查通过 |
| 资源及内容 | 同源标准字体请求实际触发；本地生成的中文扫描图像显示正确。中文是图像内容，不是嵌入式CJK字体证据 |
| 取消及清理 | 取消后画布清零；启动后立即取消无迟到回写，重新渲染成功；pagehide清文件及画布 |
| 错误/请求 | 损坏PDF固定中文错误；两引擎各9个同源GET请求，无外发、POST、pageerror或console日志；外链注释未执行 |
| CSP | 不含unsafe-eval，object-src none，真实渲染通过；PDF.js6.5已无isEvalSupported配置，不传旧参数 |
| 本地依赖 | 所有已安装包版本与锁一致，@napi-rs/canvas不存在；未改依赖声明或锁中的已有版本 |

已查看WebKit 375px中文扫描图截图，中文与图形可见。正式功能的375/768/1440、键盘排序/焦点等尚未实施，不能由此截图推定通过。

## 失败与修正

上一轮--omit=optional移除了三个既有可选构建包，导致Vite无法启动。本轮一次--no-save恢复操作导致本地依赖重新解析、版本漂移，随后以现有锁执行npm ci --ignore-scripts --omit=optional恢复；三个既有本机包（rolldown绑定1.2.13、lightningcss绑定1.33.0、fsevents2.3.3）使用精确归档，对照锁内SHA512后恢复。最终版本核对无漂移，未安装Canvas，原有锁保持。安全告警仍为安装报告中的8项，未执行自动修复。

第一次浏览器渲染超时，定位为Worker动态导入的初始化消息竞态；改为静态导入，在解析任何文档前关闭日志后双引擎复测通过。独立TS首次发现PDFWorker构造器声明不接受原生Worker，改用该版本类型完整的PDFWorker.create接口，严格类型复测通过。没有豁免失败或把首次失败当通过。

## 证据与剩余事项

本地证据`.ci/pdf-preview/evidence/results.json`含逐引擎请求/日志/尺寸/检查列表；`source-sha256.json`绑定依赖及原型源码，截图为各引擎rotated/scan.png。此目录不作为公开站点产物；原型运行方式见`scripts/prototypes/pdf-preview/README.md`。

嵌入式CJK字体、复杂CropBox、WASM/CMap实际解码路径、解析器几何一致性、最大规模与内存压力、真正渲染中取消及超时边界尚未覆盖。SSG安全导入未接入站点验证。T03仍保留未完成，不能宣称已通过全部适配门槛。正式排序/旋转/删除/导出及多页按需队列仍待实现；Firefox、真实设备/读屏/保存未验，未构建正式站点或部署。
