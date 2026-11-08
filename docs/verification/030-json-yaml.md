# 030 JSON ↔ YAML 转换验证

日期：2026-11-07。负责人在新增依赖请求后回复“推动”，批准yaml@2.9.1、锁文件/ISC许可证更新与功能实现；未授权远端部署。规格见[spec](../specs/030-json-yaml/spec.md)、[design](../specs/030-json-yaml/design.md)、[tasks](../specs/030-json-yaml/tasks.md)。

## 实现与范围

新增 `src/utils/jsonYaml.ts`、`src/workers/jsonYaml.worker.ts`、`src/views/pages/JsonYamlPage.vue`。纯TS模块先校验严格JSON语法，再通过YAML AST检查重复键、字符串键、锚点/别名/标签、节点/深度及数值；使用无原型映射存储普通数据，拒绝不支持结构，不调用可展开别名的toJS。仅支持YAML1.2单文档，输出2空格缩进，注释及排版不保留，大整数需写为字符串，小数遵循JS浮点精度。

页面提供方向、示例、只读结果、复制及取消。输入/方向变化终止旧任务并撤销结果；示例不覆盖已有输入；超时10秒；错误仅中文白名单与可用行列，不显示原文；pagehide/离页清空输入和结果并终止Worker。全部本地内存处理，不上传/保存；新增敏感路径与独立文档边界，无第三方脚本。首页、开发者目录、指南、隐私说明与SSG清单同步接入。

`npm view yaml@2 version --json`本轮核对2.x列表后采用2.9.1；`npm install --save-exact yaml@2.9.1 --ignore-scripts --no-audit --no-fund`仅新增1包。package.json/锁文件精确版本一致，本地`npm ls yaml --depth=0`核验；公开通知包含安装包ISC许可原文。官方API依据：https://eemeli.org/yaml/ 。未执行或宣称完整依赖安全审计。

当前16工具（办公9/开发7）、23站点页面加404（24 HTML）、16指南；正式八页索引白名单、域名与广告关闭状态不变。

## 实际验证

- 类型检查与生产构建：最终`npm run build:release`退出0。
- `npm run test:vitest`：37文件、295测试通过。覆盖数据类型往返、多行中文、严格JSON、解码后重复键、YAML标签/别名/多文档/复杂键、整数/非有限值、输入/输出/深度/节点限额、原型字段与错误行列不泄漏。包含正式origin下JSON/YAML页面不创建统计脚本/dataLayer的测试。
- `npm run test:ssg`：10文件、12测试通过，新增页空状态、noindex、指南、当前分类高亮、脚本隔离与YAML许可证通知通过。
- `npm run test:inventory`：154项迁移身份/SHA/owner审计及负向检查通过，原始账本与快照不变；新增JSON/YAML路由单独归新测试。
- Chromium/WebKit：448测试全部通过，最终证据 `docs/verification/evidence/m106c3/runs/2026-11-07T07-13-55.093Z-28259/`。run.json记录buildExitCode=0、testExitCode=0、portReleased=true、215.73秒；输入源码/测试/产物绑定摘要见build-sha256.json。
- 真实Worker覆盖375/768/1440双向转换、类型与多行、重复键行列、受限结构、JSON语法、示例保护、清空焦点；隔离页覆盖复制失败后选中、存储不变、无第三方请求、pagehide/离页清理；可控Worker覆盖取消、过期消息与10秒超时。可控Worker测试不代替真实解析测试。
- 375px完整页面截图已查看，无横向溢出；截图在上述run artifacts中的json-yaml测试目录。未验证真实设备、Firefox或读屏。
- `node scripts/check-adsense-readiness.mjs`：24HTML、96页脚链接、16指南，广告关闭；该脚本检查preview产物，生产包另经release校验。
- `git diff --check`通过。

## 失败修正

首轮类型检查在新页面尚未完成路由类型接入时失败，接入后通过。首轮单元测试发现yaml@2.9.1的parseDocument在logLevel:silent时不报告MULTIPLE_DOCS，导致多文档未被拒绝；已改用Document解析的error级别以保留诊断，prettyErrors:false、白名单错误映射、不调用parse/toJS日志出口及Worker console禁用保护输入。多文档负向测试保留，重新完整单元与双浏览器通过。不是通过删除限制或放宽验收解决。

## 生产产物

最终包ID：`toolhug-20261107071915255-943b69ff`。
[生产站点包](../../.ci/handoff/toolhug-20261107071915255-943b69ff/toolhug-20261107071915255-943b69ff-site.tar.gz)。
SHA256：`f08ef294ce0c03ef651b7d32c0867edd6713172f3dba5cf6b34fffab5592556a`。

最终release命令完成生产候选、包导出/独立verify、归档解压内容和dist摘要比对；根目录dist已更新，可直接上传其中内容。前一次本轮包`toolhug-20261107071804501-6eff2c85`作为历史保留，最终包额外包含正式域名隔离测试记录后的输入快照。旧dist按既有流程保留在本次移交目录previous-dist。仅本地打包，未上线或验证公网托管。
