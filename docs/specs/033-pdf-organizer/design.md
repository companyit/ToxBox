# 033 PDF 页面整理设计与渲染评估

日期：2026-11-07。仅文档评估，尚无运行原型。[规格](spec.md)、[任务](tasks.md)、[架构决策](../../architecture/decisions.md)。

## 核对与选型

package.json已声明pdf-lib@1.17.1；pdfjs-dist未声明，本地目录不存在。pdfSplit.ts已有loadPdf严格检查和copyPages；pdfLimits.ts含20 MiB/500页/100 MiB保护。新工具独立收紧100页，不改变原工具。

| 路线 | 评估 | 建议 |
| --- | --- | --- |
| 现有pdf-lib＋页码卡片 | 可复制及旋转页面，现有模块无缩略图渲染 | 无新依赖备选，无法满足视觉缩略图 |
| 浏览器embed/iframe | 插件UI不同，无可依赖的统一逐页缩略图接口 | 不采用 |
| PDF.js显示层＋现有pdf-lib | 前者Canvas预览、后者原页导出，增加解析依赖/资源 | 推荐，待核验并授权 |
| 服务端或预览API | 引入上传/后端 | 不在范围 |

2026-11-07查阅Mozilla [入门](https://mozilla.github.io/pdf.js/getting_started/)、[API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)、[示例](https://github.com/mozilla/pdf.js/tree/master/examples)、[许可证](https://github.com/mozilla/pdf.js/blob/master/LICENSE)，及pdf-lib [页面API](https://pdf-lib.js.org/docs/api/classes/pdfpage)。PDF.js主项目Apache-2.0；实际发布包、字体/WASM等资源许可需逐项核验。draft文档不代表拟锁版本已适配，本轮未核验注册表版本、锁图、安全审计或包体积。

## 模块与数据流

纯TS模块维护唯一的 `{sourceIndex, rotationDelta}` 列表：源索引从0起，至少一页、无重复、增量为0/90/180/270。组件维护File、计划、焦点和状态；卡片稳定键采用源索引，不采用输出位置。

选文件→同源Worker严格解析→返回页数/原旋转→初始化计划→PDF.js按需预览→编辑→明确导出→独立pdf-lib Worker重新检查源和计划→copyPages按计划复制→旋转为 `(原旋转+增量)%360` →保存且大小合格→一次提交下载URL。

两个解析器的页数/几何不一致时拒绝就绪并中文提示；PDF.js不能替代严格校验。显示层在主线程调度Canvas，PDF解析在其专用Worker，不宣称绘制全部在Worker。两个流程分别读取文件字节，避免复用已转移所有权的ArrayBuffer。

## 渲染与生命周期

可见/邻近页队列最多2并发，最长边320像素，缓存24页LRU；异常/非有限尺寸拒绝渲染，极端比例最短边至少1像素。按原显示旋转渲染，再应用用户增量，避免重复叠加原旋转；原旋转四种值、不同CropBox必须用样例验证。淘汰清除Canvas/位图引用。

单页10秒取消RenderTask，取消完成后才能复用Canvas；取消不收敛则销毁预览会话并提示重新加载，不无限等待。文件版本与导出版本分别隔离迟到任务。排序不重解析文件；编辑使导出失效。重选/取消检查/清空/离页销毁loadingTask/document、Worker、渲染任务、画布和URL；导出取消保留计划。

## 资源与隐私

安装获准后核对所锁版本isEvalSupported/useWorkerFetch、字体/CMap/WASM选项和日志路径；显式isEvalSupported:false，仅传本地data，资源同源打包，无CDN。不用通用viewer、脚本管理器、注释层或附件动作。含外链/动作合成PDF配合请求拦截验证零内容外发，不以配置声明代替证据。

新增资源纳入生产公开文件清单及摘要检查，精确列举，不放宽任意文件通过。维持敏感文档/GA排除；解析异常只映射固定中文，不能回传栈或文档片段。

## 适配门槛与验证

先获准精确版本核验/安装，再做小原型验证Vite同源Worker及资源、中文/内嵌字体/扫描页、取消销毁、SSR安全导入和Chromium/WebKit真实渲染。记录版本/锁/许可/审计/体积，失败返回方案审阅，不静默降级。

正式实现覆盖ORG-01～10：计划不变量、独立PDF页序/旋转/尺寸/非栅格化、限额/并发/缓存、取消竞态/无部分输出、预览失败重试、纯键盘焦点、三视口、真实Worker和敏感隔离、SSG空界面及资源/数量审计。执行类型和适当单元/组件/SSG/现有回归，记录实际源及产物摘要。真实手机、读屏、Firefox、落盘及更广PDF矩阵单独记录。

本轮未测真实渲染、性能、依赖安全或浏览器兼容；依赖安装、实现、生产打包和部署均未授权。

## 2026-11-07 注册表核验与安装阻塞

后续状态：负责人明确回复“继续安装”后已完成安装，随后回复“继续”推进隔离缩略图原型；实际双引擎结果与未覆盖门槛见[原型验证](../../verification/033-pdf-preview-prototype.md)。历史阻塞记录保留为当时状态。

API修正：所装6.5.438类型与非压缩源码已无isEvalSupported参数；不再要求传递无效参数，改为不启用脚本、不分发QuickJS资源，并以不允许unsafe-eval的CSP验证。专用解析Worker静态导入，在接收文档前关闭日志；使用PDFWorker.create。此修正不扩大PDF内容执行或站点发布资源白名单。

已执行只读 `npm view pdfjs-dist version engines license dependencies optionalDependencies dist.integrity --json`：版本6.5.438，Node要求 `>=22.13.0 || >=24`，与当前Node24.21.0兼容；声明Apache-2.0，无返回的必需dependencies，可选依赖为 `@napi-rs/canvas@^1.0.13`。注册表完整性为 `sha512-vg8Pw1x+AFKy4AMDvhuWl5cOYV8d698UoEANoFFhc79hqXDnZQqnOXoxw3HG907WHOg1JYOvLhP756boddFxpA==`。来源为npm注册表命令，版本亦与Mozilla官方入门页稳定版标记一致。兼容声明不等于实际渲染通过。

具体提案：精确安装pdfjs-dist@6.5.438，更新package.json/package-lock.json与第三方许可通知，禁用安装生命周期脚本、不安装可选原生Canvas包；安装后检查锁文件差异、实际包资源许可及安全审计，再运行同源缩略图/旋转/取消原型。不会升级无关依赖或执行部署。

自动审批审查拒绝安装，认定历史文档限定与依赖/锁修改禁令未被“继续下一个功能开发”明确解除。安装命令未执行；T02/T03仍未完成，等待负责人明确批准上述具体依赖变更。不得绕过拒绝通过其他下载/间接执行安装。本轮未编写原型或业务代码，未运行功能测试或构建。

## 正式接入补充设计（2026-11-07）

本轮明确继续推进完整工具。PDF.js资源以pdf-assets下精确文件集合由Vite插件输出；独立资源清单核对已安装精确包的文件名及摘要，候选验证逐文件核对，不允许任意扩展名放行。静态预览支持这些同源资源，主站模块只在浏览器选择文件后动态导入PDF.js，SSG不求值渲染器。Worker静态导入前述方案继续使用，不分发QuickJS。

源页检查与全部页几何通过后，懒渲染只保留可见/邻近最多24页，2并发；离开窗口的任务取消，失败可主动重试。页面保留File与编辑计划，解析/预览/导出任务各有版本，导出后编辑即撤销下载。纯TS计划和导出逻辑、预览会话、组件分别维护，不合入App.vue。

## 完整工具实施结果（2026-11-07）

本地完整功能已实现，真实双引擎与独立PDFKit证据见[033验证](../../verification/033-pdf-organizer.md)。SSG不执行PDF.js，188个同源资源有精确集合及摘要核验；预览固定320px容器避免加载跳动，提供原生拖动手柄及按钮替代，预览检查亦可取消。相关工具通过办公分类目录发现，沿用既有去重设计。历史提案/未实施说明已被本节实际结果接续；复杂字体/解码、压力及真实设备未全面覆盖，不追认通过。

## 保护失败状态修正（2026-11-07，继续推进）

补验发现超像素图像的operator流发生错误时，PDF.js显示就绪已解决的渲染Promise仍可能正常结束，生成空白缩略图。保持ORG-02“失败明确提示而非空白”的既定要求：渲染前显式等待同一显示意图/注释模式的getOperatorList，先捕获解析/限额错误；完成渲染后检查图像绘制操作的解码对象，对库返回的null失败对象拒绝提交缩略图。正常空白PDF无图像操作，不以像素为空拒绝合法空页；取消/版本/资源上限继续保留。用自制JPX/CMYK/CMap、超像素和损坏JPX样例进行真实双引擎回归，结果另记。

继续诊断发现getOperatorList也可能先resolve再reject，不能单靠公开Promise识别此类失败。实现补充为在自有Worker端口先于PDFWorker监听已锁定6.5.438协议的stream ERROR标记（值5），不读取/记录异常reason；渲染前后核对失败代次，失败页不使用已缓存的部分操作列表。版本不匹配则拒绝创建预览。并发错误保守拒绝受影响任务；重试重新创建整篇预览会话并保留编辑，避免沿用失败解析缓存。此兼容保护随版本固定，升级PDF.js必须重新核验。
