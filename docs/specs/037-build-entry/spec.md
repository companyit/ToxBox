# 037 构建入口与产物一致性

日期：2026-11-08。负责人指出运行`npm run build`无法使用新增功能，要求修正。实际核对：dist仅1个旧HTML、无裁剪页或静态目录；dist-ssg已有28HTML/20工具。根因是常用构建输出与通常检查/上传目录分离。

| 编号 | 需求与验收 |
| --- | --- |
| BUILD-01 | `npm run build`复用既有正式构建门禁，生成当前完整production站点到根dist；包含20工具、28HTML、24canonical/sitemap、188PDF资源及真实404所需文件，不以单页CSR作为成功输出 |
| BUILD-02 | `build-only`保留兼容且同样执行完整生产构建门禁，不留下旧dist；`build:release`保持显式同义入口，不引入依赖。已有dist保留到本次previous-dist，校验成功才切换，失败非零退出 |
| BUILD-03 | `npm run preview`明确读取本次dist，已知路径无尾斜杠重定向，未知路径404；中间件按实际outDir读取，不再跨目录拼接旧HTML。正确响应新增工具、JS/Worker/CSS和PDF资源，不可直接file://打开替代HTTP验收 |
| BUILD-04 | 原默认noindex构建改为显式`build:preview`/`build:preview-only`，输出dist-ssg；`preview:local`读取该目录。e2e/CI明确使用这条链路，不因为日常build改义而测试旧产物或自动发布 |
| BUILD-05 | `build:csr`隔离输出dist-csr，不覆盖完整dist；文档清晰区分dev、生产构建/预览、noindex回归和显式CSR实验 |
| BUILD-06 | 实际运行标准build并独立校验dist/site集合及摘要一致，验证新增裁剪、PDF整理、JSON/YAML等真实Worker；测试默认生产预览、preview:local及自定义outDir不串目录。类型、静态、CI本地检查与浏览器回归按实际结果记录 |

## 授权与限制

本轮请求授权修正构建入口并执行本地标准构建；沿用025的生产候选、包校验和备份切换方案，不改变站点域名、20工具/24索引或业务算法，不安装依赖、不写Git或远端、不部署。production页面用本地preview查看不会自动提交搜索平台；预览命令名称与SEO模式区分，自动化noindex产物必须使用明确入口。
