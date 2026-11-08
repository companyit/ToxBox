# 015 文本整理实现与验证

日期：2026-11-06。负责人明确选择“开发已拟定规格的文本整理工具”，据此实现 [015 规格](../specs/015-text-cleanup/spec.md) CLEAN-01～10。保留原有工作区改动，不新增依赖、上传、持久化、生产候选或部署。执行基线 HEAD 为 `856aea8dd3ec6305b6109bb062685ee7332f302e`，包含未提交工作区实现，不表述为该提交独立通过。

## 行为与文件

- `src/utils/textCleanup.ts`：独立纯 TypeScript 算法及类型化返回；六种单次操作，换行统一 LF、精确保序去重、固定 UTF-16 排序、非重叠字面替换；输入与参数原始长度校验，预估替换输出后再分配。上限分别为输入 100000、参数各 1000、输出 1000000 个 UTF-16 码元，不截断。
- `src/views/pages/TextCleanupPage.vue`：保留原输入、只读结果、成功空结果、中文错误、示例防覆盖、清空回焦、三处文本输入法保护；修改任意字段撤销结果和复制反馈，异步复制通过版本校验避免迟到回写；pagehide/卸载释放文本引用，不读取剪贴板。
- `src/data/pages.ts`、`tools.ts`、`toolGuides.ts`、`site.ts`、`src/router/routes.ts`、`ToolPageLayout.vue`、`HomeView.vue`、`PrivacyPage.vue`：路由、办公分类、首页搜索/概览、相关工具、指南与隐私披露；合计 11 工具、18 站点页面加 404，新页 noindex。原八页索引白名单、第三方统计启用条件、敏感文档组和广告关闭策略不变。
- `scripts/ssg.mjs`、`e2e-run.mjs`、`check-adsense-readiness.mjs` 及既有页面/路由/目录测试：精确更新路径、数量与指南审计。首页布局检查按分类定位首卡，保留对齐与等宽断言。
- 新增 `tests/unit/textCleanup.test.ts`、`tests/components/textCleanup.test.ts`、`tests/ssg/textCleanup.test.ts`、`e2e/text-cleanup.spec.ts`；产品需求和 015 三份规格记录授权、实现及验收。

## 实际验证

Node.js 24.21.0；最终结果如下：

| 检查 | 结果 |
| --- | --- |
| 类型检查 | 应用及测试类型通过；最终浏览器 runner 完整构建时再次执行 |
| `npm run test:vitest` | 28 文件、242 项通过；含 9 项新增算法与 6 项新增组件测试及新增路由 |
| `npm run build:csr` | 通过 |
| 完整 SSG 构建 | 最终浏览器 runner 重新构建通过，19 HTML |
| `npm run test:ssg` | 3 文件、4 项通过，含字面替换符静态 DOM 回归 |
| `npm run test:inventory` | 154 项历史身份映射、原源 SHA、唯一归属及负向夹具通过 |
| `node scripts/check-adsense-readiness.mjs` | 19 HTML、76 页脚链接、11 指南，广告关闭 |
| `node scripts/e2e-run.mjs chromium webkit` | 320 项全部通过；源、测试、夹具、配置、锁及产物无漂移，预览端口释放 |
| `git diff --check` | 通过 |

算法覆盖混合换行、末尾空行、Unicode 精确比较、空行与重复行排序、空替换、重叠匹配、字面 `$&/$1/$$`、空输入及参数限制、100000/100001 输入边界和恰好 1000000/超限输出。组件覆盖原输入保留、空结果、每个字段修改失效、超限不截断、示例防覆盖、清空回焦、三输入区组合事件、复制挂起/成功/失败及 pagehide 清理。

双引擎各在 375/768/1440px 执行六种操作、空结果、原输入保留、示例防覆盖、清空和刷新。另覆盖真实键盘 Tab/Enter、超限保留、复制失败手动选择、pagehide、首页搜索及办公目录入口。公共监测检查无意外外部请求、资源失败、运行时异常或 hydration mismatch。页面静态可读、直达刷新及 SEO 也包含在全量用例中。375px [实际截图](evidence/text-cleanup/chromium-375.png)已目视检查：输入区、替换参数、状态、指南及相关工具可读，没有页面横向溢出。

最终证据：[运行记录](evidence/m106c3/runs/2026-11-06T12-16-03.003Z-3596/run.json)、[源/产物 SHA](evidence/m106c3/runs/2026-11-06T12-16-03.003Z-3596/build-sha256.json)、[逐项结果与截图附件](evidence/m106c3/runs/2026-11-06T12-16-03.003Z-3596/results.json)。

## 发现与修正

首轮浏览器检查 306 项通过、14 项失败：preview SSG 用字符串替换正文，把指南中的 `$&` 解释为替换语法，造成静态/客户端不一致；首页布局旧绝对下标在办公工具增加后指向错误卡片。改用回调原样插入正文、按分类定位布局检查，并新增静态 DOM 回归。首轮运行期间完成修正，摘要守卫另报告源/测试变化，因此该轮不能作为最终通过证据；[首轮记录](evidence/m106c3/runs/2026-11-06T12-13-20.561Z-2837/run.json)保留。最终重新构建并在无漂移情况下全量通过。

新增静态测试最初直接导入 jsdom 时缺少其 TypeScript 声明，类型检查未通过；改为使用已有 Vitest jsdom 环境和 DOMParser，无新增类型依赖，最终类型与静态测试通过。Vite 关于未来 native 配置加载器的扩展名提示仍存在，不影响本轮构建，未作为本模块范围修改。

## 限制与后续

Firefox 本轮重试默认临时目录及 `/private/tmp`，均在启动阶段报告 `Could not find profile folder`，未执行功能用例；未重装或新增浏览器依赖。真实设备、真实读屏软件、系统剪贴板人工粘贴尚未验收；组件复制成功使用受控 Clipboard Promise，浏览器复制失败使用受控拒绝，不将其称为系统剪贴板验收。页面内容释放不承诺物理内存擦除，复制后的内容由用户设备管理。

负责人最终验收及生产候选、打包、部署未执行。Firefox、更多设备和人工辅助技术检查保留待办；不将本地测试通过称为已发布。
