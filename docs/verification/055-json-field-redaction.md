# 055 JSON字段脱敏验证

日期：2026-11-16。负责人在具体055方案交付后选择JSON字段脱敏，按[JRD-01～07](../specs/055-json-field-redaction/spec.md)实施。2026-11-19 补完本地验收。

## 修改与行为

- jsonRedact.ts复用精确JsonReader/Map/数值词元；路径为JSON字符串数组，逐段JSON Pointer处理，支持~0/~1、空根指针和无前导零的数组下标，不猜测点分或通配符。
- 先完整校验目标及重复/祖先后代重叠，全部合法后才替换。目标统一变成替换字符串，未选数值保留原词元、对象顺序和数组位置；无原型对象赋值。源字符串不覆盖，错误没有部分输出或字段/输入回显。
- 有界两空格序列化，100000源码元、30层/50000节点、10000配置码元/100路径/每条1000码元、200替换码元、100万输出；先累计预算再拼接，超限整体拒绝。
- 独立JsonRedactPage与同源Worker，10秒保护/取消、编辑与离页版本、示例不覆盖、IME、复制和按需UTF-8 redacted.json下载，URL复用/回收及失败重试。明确只处理指定路径，不保证自动清除全部敏感信息。
- 新页/developer/json-redact/接入目录/搜索/指南/开发导航/敏感整页隔离及广告排除，noindex、无GA/广告。23工具（办公14/开发9）、31HTML、23指南；正式24页索引/四页广告不扩大。无新依赖、上传、持久化或生产部署。

## 已执行验证

- 类型检查/preview构建通过；431项单元/组件（58文件）通过，新增7算法、3组件及1路由项，[单元组件](evidence/json-redact-2026-11-16/vitest.log)、[构建](evidence/json-redact-2026-11-16/build.log)。
- 静态首轮20通过/1失败，旧validatePages正向夹具仍构造29页；更新为30个站点页面后，19文件21项通过，[首轮](evidence/json-redact-2026-11-16/ssg.log)、[复验](evidence/json-redact-2026-11-16/ssg-final.log)。
- 154历史身份及负向夹具通过，[日志](evidence/json-redact-2026-11-16/inventory.log)；preview审计31HTML/124页脚/23指南通过，[结果](evidence/json-redact-2026-11-16/preview-audit.json)。

算法覆盖根/容器/空字符串、原型字段、转义/换行/Unicode路径、数字/巨大指数/负零词元、数组下标、缺失/重复/重叠、严格JSON/重复键/Unicode/深度、各资源上限，独立JSON.stringify格式对照及输出恰好100万码元接受、多一码元拒绝。组件覆盖原输入/配置保护、错误标记、示例、取消/超时/迟到、IME/pagehide、复制失败与迟到反馈、下载延迟生成/复用/回收。

## 2026-11-19 复验

- 本地预览构建、类型检查、431 项单元/组件、21 项静态以及 154 项历史身份检查通过。预览审计覆盖 31 份 HTML、124 处页脚和 23 份指南。[单元与组件](evidence/json-redact-2026-11-19/vitest.log) · [静态](evidence/json-redact-2026-11-19/ssg.log) · [身份](evidence/json-redact-2026-11-19/inventory.log) · [预览审计](evidence/json-redact-2026-11-19/audit.log)
- 首次定向运行 Chromium 4 项通过、WebKit 1 项通过，另 3 项在整页导航期间读取 Vue 挂载状态，执行上下文被销毁。用例等待目标页加载后，Chromium 和 WebKit 共 8 项通过，覆盖三个视口、键盘操作、下载字节、精度及隐私检查。上轮 624 项全站日志未记录最终结果，本轮浏览器回归范围为 055。[定向复验日志](evidence/json-redact-2026-11-19/e2e-final.log)
- 隔离生产测试候选通过 6 项检查，包括 31 页原始 HTML 和 Vue 挂载后的 SEO 验证、24 页正式索引、四页广告白名单及敏感工具整页导航隔离。正式产物与部署另行授权。[生产候选结果](evidence/seo-growth/seo-1795092800700/results.json) · [生产候选校验记录](evidence/seo-growth/seo-1795092800700/candidate.json) · [预览源文件与产物 SHA-256](evidence/json-redact-2026-11-19/sha256.json)

## 限制

不自动发现敏感信息；不含通配符、正则、可逆处理、文件导入或其他新模块。真实设备、读屏、系统保存和负责人验收仍待执行；Firefox 最近一次 2026-11-16[启动探测](evidence/table-download-2026-11-16/firefox-probe.log)因profile失败，本轮不反复启动或更改缓存，不声明三引擎通过。

本轮仅更新preview与独立测试候选，标准dist不更新，未部署；npm run preview:local查看。
