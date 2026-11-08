# 设计与已批准方案

本轮批准并安装yaml@2.9.1精确依赖，更新锁文件及第三方ISC许可证通知。安装前仅有Vite可选peer声明且本地yaml/js-yaml均不可解析；不能把该历史声明当作已安装依据。

纯TS模块负责参数与类型白名单、JSON重复键与数值检查、YAML AST检查和序列化。使用解析器Document/AST，而非仅parse成对象：先检查文档错误、重复键、别名/标签/映射键与深度，再转换为JSON兼容结构；禁用merge/customTags，maxAliasCount:0，prettyErrors:false、Document解析使用logLevel:error（记录错误但不调用parse/toJS的日志出口），Worker禁用console输出，错误不拼接原文。core类型解析结果仍需白名单验证，不单凭schema推断安全性。字符串包含<<作为键也明确拒绝，避免误认为支持合并语义。

Worker负责可取消解析与编码，页面维护方向/输入/只读输出/状态版本；复用已有本地工具样式与生命周期模式。输出2空格缩进，不保留注释/格式；JSON输入不可仅使用原生JSON.parse而忽略重复键和精度风险。SSG增加新页面、指南、敏感隔离和明确数量验收，正式八页索引不变。

备选自制YAML子集解析器无需依赖，但容易误解析缩进、转义与类型，且限制过多，不建议用于标注为JSON↔YAML的通用工具。新增重量级编辑器、上传、后端及持久化不在方案。

官方依据：https://eemeli.org/yaml/ （Document、uniqueKeys、LineCounter、prettyErrors、maxAliasCount等选项）；https://github.com/eemeli/yaml/blob/main/docs/03_options.md 。实施时依据锁定版本核对API并验证，不把文档选项本身视为完整保护。

负责人本轮已确认新增yaml依赖、锁定版本及对应锁文件/许可证更新。没有新增编辑器、后端或持久化。

## 依赖确认

负责人已回复“推动”，批准yaml@2.9.1和对应锁文件/许可证更新。安装使用ignore-scripts，不增加其他包。本轮核验发现parseDocument在logLevel:silent下不报告多文档，因此改为error并用本地AST处理、白名单错误映射和Worker日志禁用保证不输出输入片段。
