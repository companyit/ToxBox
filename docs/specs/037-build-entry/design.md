# 037 设计

[规格](spec.md)、[任务](tasks.md)。

package脚本的build/build-only/build:release都复用现有build-release.mjs。它先类型检查，再构建唯一正式候选、校验站点/包/归档，备份原dist后切换完整site。不得仅将dist-ssg复制为正式站点，因为其中是noindex preview。

原build流程重命名为build:preview（类型+build:preview-only），原SSG入口为build:preview-only；preview:local显式传dist-ssg。e2e runner、Playwright webServer和CI工作流切换这两个入口，仍构建一次并绑定同一摘要；仅本地更新工作流，不触发远端。

默认preview通过Vite读取dist；默认非候选中间件将HTML读取根设为server.config.build.outDir的实际绝对路径。静态assets和pdf-assets仍交由Vite服务同一根目录；严格验证候选的路径/摘要分支保留。文件名路径保持白名单匹配，不开放任意文件读。CSR明确输出dist-csr并忽略该生成目录。

构建后从handoff记录独立核验dist与包site集合和SHA全等，检查28HTML/24索引/20目录卡片；默认preview运行代表性新增工具实际任务。原自动化preview全站回归验证noindex与目录根隔离，不以production预览替代原测试。文档和测试明确说明build-only为兼容入口且仍执行全部门禁。
