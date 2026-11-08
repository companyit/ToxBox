# PDF 本地缩略图适配原型

本原型独立于站点入口，不作为正式工具或部署包。使用现有Vite、Playwright、pdf-lib和已批准的pdfjs-dist@6.5.438。

```sh
node node_modules/typescript/bin/tsc -p scripts/prototypes/pdf-preview/tsconfig.json
node node_modules/vite/bin/vite.js build --config scripts/prototypes/pdf-preview/vite.config.mjs
node node_modules/vite/bin/vite.js preview --config scripts/prototypes/pdf-preview/vite.config.mjs --host 127.0.0.1 --port 4188 --strictPort
```

在另一终端运行 `node scripts/prototypes/pdf-preview/verify.mjs`。构建到`.ci/pdf-preview/site`，验证结果与截图写入`.ci/pdf-preview/evidence`；原型不读取真实用户样例。关闭本地服务后端口释放。

检查仅覆盖首页缩略图、旋转、取消/清理、重新渲染、损坏PDF、同源字体、中文扫描图像、外链注释不执行及CSP。未实现多页队列/缓存、拖动/删除、PDF导出或站点SSG接入；未验证嵌入式CJK字体、Firefox、真实设备、读屏及系统保存。

PDF.js 6.5.438无isEvalSupported参数，本原型不传无效参数；不包含QuickJS资源、不启用脚本/注释层，并用不含unsafe-eval的CSP验证。资源复制白名单只用于隔离原型，不修改站点发布资源策略。
