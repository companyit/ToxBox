# 029 图片压缩与格式转换验证

日期：2026-11-07。本轮负责人选择该功能并授权实现；不包含服务器部署。规格见 [spec](../specs/029-image-convert/spec.md)、[design](../specs/029-image-convert/design.md)、[tasks](../specs/029-image-convert/tasks.md)。

## 行为与文件范围

新增 `src/utils/imageConvert.ts`、`src/workers/imageConvert.worker.ts`、`src/views/pages/ImageConvertPage.vue`。支持批量静态 JPG/PNG/WebP 输入、等比只缩小、质量设置、体积变化、单项/ZIP 下载、取消与清空。默认 JPG，透明输入转 JPG 铺白底。复用现有 JPG/PNG 头部校验及已安装 jszip，无新增依赖；Worker 串行解码，检查像素/体积/超时，编号命名，不上传或持久化内容。

同步接入 pages/tools/routes/toolGuides、分类高亮、ToolPageLayout、sensitivePages、广告排除配置和隐私说明；SSG、浏览器 runner 及当前数量测试清单增加一页。当前 15 工具（办公9/开发6）、22 站点页加404（23 HTML）、15指南；八页正式索引白名单不变。原始154项迁移身份和SHA账本未改动。

WebP 输出取决于浏览器编码器：本机 Chromium 输出三格式通过；本机 WebKit 输出 JPG/PNG 通过、WebP 输入解码通过，但 WebP 编码不支持。工具核对 Blob MIME，明确提示改选格式，不把 PNG 伪装为 WebP。无损 PNG 不使用质量参数；文件不保证变小，重绘/有损编码会影响画质及色彩。普通8位非隔行PNG/非CMYK JPEG限制沿用现有检查器。

## 实际结果

- 类型检查及 production 构建：`npm run build:release` 退出0。
- `npm run test:vitest`：36文件、286测试通过。
- `npm run test:ssg`：9文件、11测试通过，包含新页静态空状态、指南、noindex与脚本隔离。
- `npm run test:inventory`：154项迁移身份、SHA、owner与负向审计通过，未把154项重复计为新功能测试。
- Chromium/WebKit：434项通过，证据 `docs/verification/evidence/m106c3/runs/2026-11-07T06-57-24.749Z-26037/`，含构建/输入摘要与结果记录。真实图片覆盖三种格式签名、40×20输出尺寸、透明像素/JPG白底、ZIP两项编号、WebP回读、损坏保留文件、旧链接清理、取消、pagehide、无第三方请求与375/768/1440布局。WebKit不支持WebP输出为明确报错验收，未跳过测试。
- `node scripts/check-adsense-readiness.mjs`：23 HTML、92页脚链接、15指南，广告关闭；该脚本检查 preview 静态产物，生产包另经 release 校验。
- 375px实际页面截图已检查，无横向溢出；截图位于运行 artifacts。真实设备、Firefox、读屏尚未验证。
- `git diff --check` 通过。

## 失败与修正

初轮单元暴露旧数量断言与新增路由误归历史迁移身份，已增加当前清单并将新路由归新测试，保留旧身份。一次构建后 runner 拒绝缺少新页的旧清单，未进入浏览器；修正明确清单后重跑。浏览器初轮格式选择框隐式名称含选项文本导致定位超时，补充明确名称后重跑。随后WebKit发现WebP编码不支持：保留不静默回退的实现，默认改JPG、补充说明并加入明确能力失败验收；最终完整434项通过。失败现场保留在早前 runs，未宣称通过。

## 交付

生产包 ID：`toolhug-20261107070056781-631fe650`。
[站点包](../../.ci/handoff/toolhug-20261107070056781-631fe650/toolhug-20261107070056781-631fe650-site.tar.gz)，SHA256 `74a86b9b405e34ec4a3e1865784e5478ef1cdf378c15ac2a236a4327dee247d6`。

本次 release 命令已完成候选、包、解压归档及 dist 内容摘要核验；根目录 dist 可直接上传其中内容。旧 dist 在本次移交目录 previous-dist 保留。正式域名仍为 https://www.v7luck.com。未执行部署或公网验收；品牌商标、真实设备与托管检查继续独立处理。
