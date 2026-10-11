# M1-06C5A 公开仓库提交前整理

日期：2026-10-11。负责人确认C4本地Dev Done，批准继续以现有公开companyit/ToxBox为候选CI目标；本轮仅整理提交范围、忽略规则及必要脱敏。当前main，没有暂存、commit、push、PR、远端仓库变更或部署，停止等待人工验收。

## 文件保护与实际修改

整理前484个Git可见文件的SHA及状态保存在忽略目录 `.ci/m106c5a-originals/`；本轮未删除任何原有文件。生产src、应用配置、package/锁文件、Node pin、工作流、正式scripts/e2e/tests及154迁移账本均保持本轮开始时的字节。已有未提交开发成果保留。

修改.gitignore，补充007及C2～C4报告的公开证据说明，生成本报告、三份提交清单及验证账本。23份日志/环境记录仅清理本机工作区、浏览器缓存和临时目录，5份历史CDP辅助脚本仅将输出目录改为相对脚本位置；全部28份原文件字节备份在忽略目录，未改断言、输入、结果或版本。详见[脱敏账本](evidence/m106c5a/redactions.json)。历史快照的SHA继续指向当时原始文件，公开副本另有SHA，不伪造历史完整性。

## 三份准确清单与统计口径

- [必须提交](evidence/m106c5a/must-submit.json)：生产源码与配置、package/lock/Node、工作流、全部正式测试和辅助、迁移映射、006/007/ADR、验收报告、结构化证据及本轮清单。每个文件记录原因、字节数、Git状态及是否为当前变更。
- [可提交但需人工审查](evidence/m106c5a/review-required.json)：历史已跟踪截图/原始浏览器记录/CDP宿主，可选文本日志、历史包/锁快照及本地复核脚本。明确列出需要审查的用户内容、机器信息、用途或外部本地依赖。未经审阅不自动并入暂存集合。
- [必须排除](evidence/m106c5a/excluded.json)：本地依赖、构建/中转目录、Playwright原始runs和环境秘密；按目录列出实际文件数和大小，文件全部保留本地。

[汇总manifest](evidence/m106c5a/manifest.json)记录准确集合、总字节、当前工作区与缺失输入。候选全集=必须提交+需审阅，包含已跟踪且未修改的基线文件；其中currentChanges才是本轮准备进入暂存审查的差异集合。排除统计只计算项目内实际存在文件，含node_modules和忽略的原始备份，不包含.git历史数据库或项目外浏览器缓存；不存在的预防规则计0，不把目录数当文件数。

## 忽略与白名单

保留node_modules/、dist-ssg/、.ssg-build/、.ci/规则，新增根playwright-report/、test-results/、m106c3/runs/、临时trace.zip/*.trace.zip、test-failed截图和error-context。没有泛化忽略所有PNG/HTML/JSON，也未忽略结构化测试证据。

`.env`、`.env.*`和`.envrc`排除；`.env.example`、分环境example、template、sample及.envrc.example例外可见。模板若包含真实秘密仍禁止提交，例外不代表内容免检。

特别验证 `docs/specs/007-testing-ci/design.md` 和 `docs/verification/evidence/m106c4/actions.json` 未被忽略且必须提交，分别供inventory与静态工作流校验读取。所有CI配置/源码/测试/锁文件输入本地齐全；尚未进入Git索引的新输入由清单标识，不能说远端已具备这些文件。

`git ls-files -ci --exclude-standard`未发现本次规则命中的已跟踪文件。历史截图和原始浏览器证据仍在Git跟踪范围，单列审阅；未执行自动移除索引。忽略规则不会抹除已发布历史。

## 隐私及安全检查

本轮候选静态扫描覆盖已知GitHub/API/AWS密钥、私钥头、完整邮箱模式、非必要用户路径及环境身份字段。未发现已确认真实秘密或候选文件中的个人邮箱；测试中的保留域名凭据/邮箱样例保持原语义。敏感canary命中仅是扫描器和合成负向夹具，不是生产秘密。无需处理生产密钥。

候选文本已无本机用户目录/缓存路径残留，环境记录未发现需要处理的主机名/账号字段；保留Node/npm/OS/架构和浏览器版本以便复核。Git已有作者姓名/非匿名邮箱属于历史身份披露，未改写历史，需负责人接受既有公开记录。

截图和原始浏览器记录没有完整OCR或逐项用户输入人工审计，不能宣称全体证据无敏感内容；因此列为需审阅或本地排除。工作流现有工件扫描、合成输入、14/7天策略保持，本轮未触发真实GitHub上传。模式扫描不能保证识别任意秘密，人工审阅范围不由“0命中”替代。

排除的Playwright历史runs保持本地可查。C2～C4报告明确标注原始Trace/截图不随候选提交上传，结构化摘要和历史结果保持；m106c4/selfcheck.py依赖本地历史失败报告，属于可选本地复核工具，不能说远端可无条件复现这段历史扫描。

## 实际验证

[命令账本](evidence/m106c5a/commands.json)记录退出码和耗时，原日志只留忽略目录，公开[测试摘要](evidence/m106c5a/test-summary.json)不包含本机用户名。

| 命令/检查 | 结果 |
| --- | --- |
| npm run test（第一轮） | Chromium42/42，0 skip/flaky/unexpected |
| npm run type-check | 退出0 |
| npm test | Chromium42/42 |
| npm run build | 退出0，8正式页+404.html |
| npm run test（第二轮） | Chromium42/42 |
| git diff --check | 退出0；归档完成后再检查 |
| git check-ignore/静态扫描/输入清点 | 详见[检查记录](evidence/m106c5a/checks.json) |

原154项Vitest/SSG测试代码和唯一归属账本保持；本轮没有单独重跑Vitest151/SSG3，不冒充新的通过证据，沿用C4验证记录。三轮浏览器执行126次不新增逻辑覆盖。未重跑Firefox/WebKit、未下载浏览器、未安装依赖或触发远端CI。5份历史CDP宿主未启动浏览器执行，只改变目录定位并静态核对其余内容一致。

## 人工审批与停止点

必须提交清单中未发现未确认真实秘密，忽略及CI完整性检查通过，具备进入下一阶段**按明确白名单进行安全暂存审查**的技术条件；不是本轮授权暂存。需审阅清单中的截图/原始浏览器数据/可选日志不得自动带入，若发现真实敏感信息应先停止并处理。

负责人仍须验收28份脱敏变更、确认既有作者身份公开记录和需审阅证据的选取，再单独授权git add/commit及未来目标分支push/PR/Actions验证。本轮未清理历史、未移除已跟踪文件、未创建PR或改变仓库可见性，不自动进入下一阶段。Release Ready保持未完成。
