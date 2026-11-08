# WorkDev Tools 首版交付与回滚指南

本指南是执行准备；本地通过不代表云端发布获批。公开试用版拟定v0.1.0。正式origin为https://www.v7luck.com；根域名跳转尚需独立批准和验证。

## 日常打包入口

正式上线执行 `npm run build:release`，自动类型检查、生成唯一候选、构建 production 页面、导出并验证归档；正式域名读取 `config/site-release.json`。需要本机提供 `tar`。成功后终端输出 `.ci/handoff/<唯一ID>/<唯一ID>-site.tar.gz` 和 SHA256，同目录包含校验文件与 `handoff.json` 来源记录。历史包不会覆盖。

成功后根目录 `dist/` 即为本次校验通过的生产站点，可直接上传其中全部内容；也可使用 tar.gz。原有 dist 保留在本次移交目录的 `previous-dist/`，新 dist 不混入旧文件。不要上传包外记录。后续执行 `build:csr` 会重新把 dist 变成单入口 CSR；上线前请重新运行 `npm run build:release`。此命令不执行远端部署，也不代替完整测试或线上验收。失败非零退出，保留现场，修复后重新运行生成新 ID。

本地检查使用 `npm run build` 与 `npm run preview`，输出 `dist-ssg/`，默认 preview/noindex。`build:csr` 仅生成单入口 CSR，不适用当前真实 404 的静态托管部署。

## 冻结与导出

1. 冻结源码，记录HEAD、未提交Diff及新增文件SHA；不得在候选生成后改写来源。
2. 从仓库根执行`node scripts/release-candidate.mjs build --candidate <唯一ID> --mode production --origin https://www.v7luck.com`。保存返回的receipt路径和独立SHA。
3. 执行`node scripts/release-package.mjs create --package <唯一包ID> --receipt <receipt路径> --expected-sha <receipt独立SHA>`。保存返回的manifest SHA于包外审批记录。
4. 移交前执行`node scripts/release-package.mjs verify --package <包ID> --expected-sha <独立manifest SHA>`。仅site/为公开上传内容；metadata/、receipt、manifest、SUCCESS、服务端代码和.ci严禁上传公开站点。
5. 打包目录禁止手改；出现错误保留现场，修复后使用新ID。无效目录不可作为成功候选。

## 本地验证

`node --test --test-concurrency=1 tests/release/package.test.mjs`建立独立preview/production候选及故障副本，不覆盖dist-ssg/.ssg-build。该测试会执行两次隔离候选构建并写入.ci/release-01/candidates和packages，须预留空间。原Vitest154迁移身份与本测试分别报告。类型、单元、SSG、浏览器各自记录真实结果。

## 托管验收（待单独授权）

负责人先确认具体阿里云产品、区域、费用和操作权限。不得将本指南视为购买、DNS、证书或部署授权。

- 测试环境必须通过响应头X-Robots-Tag:noindex及访问限制阻止收录；production HTML不可直接在可收录的测试域名公开。
- HTTPS证书匹配www域名，HTTP至HTTPS和根域名至www规则需独立确认，不从应用canonical推定存在。
- 八个规范页面均返回200，可刷新；已知无尾斜杠路径按批准规则跳转；未知路径真实HTTP404并提供404.html，不能SPA回退200。
- JS/CSS/SVG MIME正确；不存在路径穿越、目录列表、服务端/审计文件泄露。HTML短缓存或需重新验证；hash资源可长缓存immutable。错误页不得缓存为正常页面。
- robots允许正式页面，sitemap恰含八个规范URL；404无canonical且noindex。检查原始HTML与hydration后head一致。
- Chromium/WebKit全站与手机回归、负责人视觉、实际设备触控/软键盘、读屏检查分别签署。Firefox未验证支持范围及补验责任由负责人决定。

## 发布与监控（待单独授权）

发布审批记录包ID、外部manifest SHA、测试证据、已接受风险、负责人批准及回滚包。优先上传版本化目录并由托管平台原子切换；平台不支持时须另审中断风险。禁止一边覆盖线上文件一边将其宣称原子发布。

发布后从实际公网检查首页、两分类、当前目录全部工具、关于/联系/隐私/条款、未知404、资源、HTTPS和SEO。监控采用获批的平台日志与人工探测；不新增用户输入采集、广告或埋点。

## 当前19工具的移交前核对

人工执行入口为[19工具清单](../verification/local-review-19-tools-2026-11-07.md)，不是旧12工具范围。当前完整实现及后续补验见[033验证](../verification/033-pdf-organizer.md)与[补验报告](../verification/033-pdf-organizer-followup.md)。未签收项保持未完成，不因本地回归自动批准生产操作。

PDF页面整理新增`pdf-assets/`同源资源：当前批准包共188项，必须与站点JS/Worker一并移交。实际托管检查`.wasm`为`application/wasm`、`.js`为JavaScript MIME、`.ttf`为`font/ttf`、`.icc`为`application/vnd.iccprofile`，`.bcmap`/`.pfb`为二进制类型；未知资源应404。浏览器实际选择合成JPX/CMYK/CMap PDF，核对缩略图与同源资源响应，不能用本地Vite结果推定远端配置。

这些资源路径未包含内容hash，不套用hash JS资源的长期immutable缓存；托管配置应允许版本更新后重新验证，避免旧字体/解码资源与新Worker混用。现有Nginx片段没有为这些扩展名逐项声明MIME，需在实际服务器核对继承的mime.types与缓存策略；本轮未修改服务器或宣称配置生效。

## 回滚

保留上一个通过审批的完整包和独立SHA，不删除旧hash资源。故障时记录时间、URL、HTTP/控制台证据，由负责人批准回滚；先独立verify旧包，再切换到旧site/，核验八路由、真实404、资源及SEO，按平台规则失效HTML缓存。没有数据库迁移，不涉及用户数据恢复。无法确认旧包完整性时停止，不手工拼装产物。

## 上线停止条件

候选或包SHA错误；未知文件变化；真实404/MIME/HTTPS失败；生产索引策略错误；浏览器核心功能失败；缺少发布或回滚审批。上述任一项存在维持NO-GO。
