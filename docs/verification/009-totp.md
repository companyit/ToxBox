# 009 本地 TOTP 工具验证

日期：2026-11-02。负责人确认本地 TOTP 工具范围并授权开发。未部署、未改远端配置、未安装依赖。

## 改动与行为

新增 `/developer/2fa/`，复用工具页布局并接入首页、分类与相关工具。新增独立 TypeScript Base32/TOTP 模块，使用浏览器 Web Crypto，无请求或存储。页面支持密钥遮挡、手动生成、30 秒到期更新、复制、清空、中文错误及能力失败提示。编辑后使旧结果失效，异步计算带版本检查。pagehide 与卸载均清理。

客户端路由跨入或离开敏感页时整页导航，敏感文档不初始化 GA；不是通过删除 script 元素冒充卸载。新页 noindex、不加入正式 sitemap 白名单。SSG 页面总量由 8+404 改为 9+404，正式索引仍保持 8 页；旧迁移测试身份保留，新路由使用独立测试注册。

## 实际检查

- `npm run type-check`：通过。
- `npm run build`：通过，含类型检查及 SSG，10 个 HTML 输出（9 页与 404）。存在既有 SEO 模块无扩展名导入警告。
- `npx vitest run --project unit --project components --project ssg`：13 文件、163 项通过。首次回归发现新增路由缺少旧迁移身份，已为新路由采用独立测试注册后重新全量通过，没有伪造历史迁移身份。
- 新增算法覆盖 RFC 6238 SHA-1 六组时间向量的 6 位结果（含前导零）、时间窗边界、严格 Base32 及超长拒绝。
- 新增组件覆盖异步旧结果丢弃、编辑停止计时器、跨窗更新、复制拒绝、清空、pagehide 与卸载清理。
- Chromium headless，375×812：通过正式 origin 的本机请求映射访问预览产物，实际生成 6 位验证码，确认无横向溢出；敏感页没有 Google 请求；离开和重新进入时 document 标记消失、密钥为空，公开页可插入 GA 标签而敏感页不插入。Google 请求均拦截，未向线上发送测试统计。
- `git diff --check`：通过。保留用户先前发布相关改动。

## 限制

上述 origin 映射不是生产部署验证。未执行正式候选打包、全 E2E、Firefox/Safari/真实手机、真实 GA 后台或真实剪贴板授权成功验收；Web Crypto 不可用、浏览器后台恢复/时钟大幅跳变等完整故障矩阵仍需补验。本轮未扩大正式 SEO 索引集合。用户已发布 GA 的陈述不等于本轮独立线上验收。

## T07 后续开发与补验（2026-11-02）

修复验证码时间窗更新后残留旧“已复制”提示。增加后台恢复重算、时钟后退、过期瞬间复制拒绝、安全计算不可用/失败保留输入且不回显内部错误的测试。持久新增 e2e/totp.spec.ts，补齐 E2E 10 HTML 清单与四工具卡片断言，保留几何/焦点/精确集合验证。历史迁移 154 项独立于新增用例计数，原 SHA 门禁保留。

实际结果：类型检查及 npm run build 通过；Vitest unit/components/ssg 13 文件、167 项通过。第一次完整回归发现旧三卡片断言，修正后 Chromium 118 项通过。WebKit 完整回归 117 项通过，1 项新增历史返回测试存在文档切换等待竞态；修正为等待导航完成及可重试的目标控件后，Chromium/WebKit 三项 TOTP 用例各重复三轮，18 项全通过。最后未重复完整双引擎套件，不宣称最终全量三引擎绿灯。专项结果及汇总见 [证据](evidence/totp-followup/summary.json)。

Firefox 默认临时目录及 /private/tmp 两次尝试均因 Could not find profile folder 启动失败，停止无效重复尝试，不称兼容性通过。WebKit 不等于真实 Safari。

npm run test:inventory 未通过：tests/ssg.test.mjs 当前 SHA 为 946da0c7695d9c62fc0684ca1f4a917e1c3e3a7335665f7720bf85b50b2a9c1b，账本预期 aec9e9e325a6280694fbbae429bb03fc4168d12b912ae250e505eeb3eeaee193。只读检查证明该文件与 HEAD 一致，本轮未修改。保留历史摘要，不为通过而更新；单独调用 validateInventory 验证原 154 身份及唯一 owner 映射通过，这不等于整个 inventory 命令通过。

T07 本地开发补验完成上述范围，完整发布验收仍未完成：Firefox、真实 Safari/手机、正式候选/部署与历史 SHA 门禁待处理。未部署或变更 GA 后台。

## T07 再次开发：历史门禁修复（2026-11-02）

只读 git 历史核对确认：0de610b 的 tests/ssg.test.mjs 与 migration.json 中 aec9e9… 摘要匹配；856aea8 为同一旧源追加第三方许可证同一性断言，成为当前 946da0… 摘要。不是本轮修改遗留源导致。保留 migration.json，新增 tests/legacy-baselines/ssg.test.mjs.txt 保存迁移原文、tests/source-evolution.json 登记明确演进及依据。test-inventory 对登记项同时严格核验原摘要、快照及当前源摘要，未知修改仍失败；新增负向测试覆盖当前源、快照、原摘要和源路径篡改。

实际结果：npm run test:inventory 通过，154 历史身份及唯一 owner 保留；Vitest unit/components/ssg 14 文件、168 项通过；完整 npm run build 的类型与 10 HTML SSG 构建通过。此前 inventory 失败状态已由此轮真实执行取代，历史失败证据继续保留。

Firefox 本轮另用仓库内独立临时 profile 排查，仍在启动阶段报 Could not find profile folder，测试 profile 已清理。不改机器 Firefox 安装，不将此环境失败归因于应用功能，也不记为兼容性通过。

### 最新全量回归结果

`node scripts/e2e-run.mjs chromium webkit`：236 项全部通过（各引擎 118 项），包含最终修正后的 TOTP 跨页/返回用例、旧工具、10 HTML、静态可读与响应式回归。本次构建、测试和产物摘要完整记录于 [运行证据](evidence/m106c3/runs/2026-11-02T13-57-43.616Z-5743/run.json)。此前未重跑最终全量的限制由本次结果取代。T07 自动化与 Chromium/WebKit 本地验收完成；Firefox/真实 Safari/实机及生产发布门槛继续保留，未部署。

## otpauth 导入与参数识别（2026-11-02）

负责人选择“支持 otpauth 链接导入及参数识别”。新增纯模块 src/utils/otpauth.ts；支持 SHA1/SHA256/SHA512、6/8 位、1～300 秒整数周期，默认 SHA1/6/30。周期上限属于产品限制。拒绝 HOTP、重复/未知参数、缺失或空参数、无效 Base32、无效百分号/UTF-8、标签多路径、issuer 冲突与越界参数；不自动访问链接或读取页面 URL。错误文本不携带原输入。

页面新增遮挡的链接输入与导入按钮；成功后清空链接输入框，显示账户/发行方和参数，手动生成验证码。导入失败不覆盖已有密钥/参数；手动编辑密钥恢复默认参数；清空/离页移除全部信息并停止旧计算。计算、倒计时、progress 与过期复制共用周期。保留 GA 文档隔离与新页 noindex。

本轮最终检查：npm run build（含类型检查与 10 HTML SSG）通过；Vitest 15 文件、172 项通过；npm run test:inventory 通过。新增解析非法输入矩阵和 RFC SHA-256/SHA-512 六组 8 位向量，覆盖 60 秒参数；组件验证原子导入、失败保留、参数传播和清空。浏览器针对最终构建执行 e2e/totp.spec.ts，Chromium/WebKit 各 4 项共 8 项通过，验证 8 位/60 秒已知结果及跨窗更新、失败保留、手动回退、整体清空与原有隔离用例。结果与源码摘要见 [导入证据](evidence/otpauth/summary.json)。git diff --check 通过。

限制：本次未重跑最终全部浏览器回归；不将此前 236 项全量结果冒充扩展后全量结果。Firefox 已知本机启动限制、真实 Safari/手机与生产发布门槛仍保留。未安装依赖、未改远端或部署。

参考：[Google Key URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)，算法继续依照 RFC 6238；原固定参数与不支持 URI 的历史范围由本轮 OTP-08～10 替代。

## 导入扩展后全量验收收尾（2026-11-02）

本轮继续既有 OTP-08～10，新增两个生命周期测试：旧计算尚未结束时导入新参数，旧 promise 结果必须丢弃且不自动生成新码；pagehide 同时清除已导入账户、发行方、密钥、参数和未提交链接。本轮无需业务代码修复。

实际结果：Vitest 15 文件、174 项通过；npm run test:inventory 通过；E2E 前置完整 npm run build（类型检查及 10 HTML）通过。`node scripts/e2e-run.mjs chromium webkit` 最终全量 238 项全部通过（每引擎 119 项），包含 otpauth 导入及周期更新、全部旧工具、页面/SEO/SSG 与响应式回归。git diff --check 通过。对应 [运行记录](evidence/m106c3/runs/2026-11-02T14-26-15.227Z-6970/run.json)，含当次构建、源与测试摘要和浏览器结果。

此前“本次未重跑扩展后全量”的限制由本次结果取代。Firefox 本机 profile 启动限制、真实 Safari/手机及正式部署门槛仍保留；未新增依赖或功能范围，未部署。
