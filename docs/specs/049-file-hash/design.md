# 049 设计

日期：2026-11-15。状态：方案待审阅，未实现。关联[规格](spec.md)、[任务](tasks.md)。

## 模块与数据流

新增纯TypeScript模块fileHash.ts：算法联合类型、字节限额、文件大小验证、ArrayBuffer摘要封装和十六进制编码、预期值标准化/比对。SubtleCrypto通过参数或globalThis.crypto?.subtle注入，测试用已知向量/Node独立实现对照，不以实现镜像作为唯一预期。模块不访问DOM/网络/存储，不接受任意算法名或动态脚本。

新增fileHash.worker.ts接收File、固定算法和任务代次，先检查size，arrayBuffer后再次验证实际字节数，发送reading/hashing阶段，然后调用digest，仅返回摘要字符串及固定错误码。原始字节不回传主线程，不解码/去BOM或转换换行；不依赖现有严格UTF-8 fileText.ts，因为此模块处理任意原始字节。主线程30秒定时、取消或离页直接终止Worker并递增代次。

新增FileHashPage.vue：empty/selected/reading/hashing/success/error状态；独立维护预期值/匹配反馈与复制版本。文件选择不自动启动摘要计算；输入expected不重算摘要，仅撤销旧核对结果。换文件或算法先撤销摘要及所有反馈。取消/超时保留File供主动重试；清空/pagehide/unmount重置默认算法、清除原生file控件、引用和任务。同文件可重选，错误固定中文不回显输入。

## 集成与隐私

路径/developer/file-hash/，归入developer。新增PageName/ToolPageName、懒路由、工具目录/排序、原创指南及相关工具；更新开发分类高亮/标签与静态页面/runner明确清单。接入既有isSensitivePath/isSensitiveRoute及广告excludedPaths，048 allowedPaths保持原4项，不给工具页加载广告/GA。SSG不求值Web Crypto或解析文件，只输出空态，新页noindex。实现并验收后才更新22工具/30HTML/22指南，不提前宣称数量已改变。

## 验证与待确认

单元：固定向量与Node createHash独立对照三算法；空数据、UTF-8中文和emoji原始字节、BOM/CRLF与LF差异；字节上限/超限及编码补零。预期摘要覆盖首尾空白/大小写、一位缺失/多出、非十六进制、内空白和超256码元，不自动去分隔符。

组件：Worker阶段/失败/构造失败/超时取消，重选、换算法、迟到消息及复制Promise，离页清理；独立核对预期值变化不清除已计算摘要。浏览器：三宽度真实文件读入和Web Crypto，空文件/二进制/超限、复制失败、键盘及200%字号、真实广告页到工具页执行哨兵清除。只用合成文件，不调用广告或外部哈希接口。

待负责人确认：新模块选择、20 MiB/30秒限额、三种SHA-2算法、单文件/显式核对首版范围。无新依赖或后端提案；如需流式/批量/MD5/超大文件，另行规格和架构评审。不自动恢复046翻译或实施045扩容，不部署。
