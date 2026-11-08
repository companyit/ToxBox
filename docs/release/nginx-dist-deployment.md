# 自行上传 dist 到 Nginx：部署适配说明

日期：2026-11-03。负责人确认自行打包并通过 dist 在 Nginx 托管；实际 server 配置、root/alias/proxy_pass 及服务器绝对目录尚未提供。本文仅为操作准备，未连接服务器或执行部署。

## 目录名可以保留，产物需区分

- `npm run build:csr` 输出 `dist/`，为 CSR 单页产物，不包含各路由的独立静态正文。
- `npm run build` 输出默认 `dist-ssg/`，含静态正文，但默认是 preview SEO（noindex）；也不能直接当作正式 SEO 产物。
- 本轮已验证的生产 SSG 发布包含独立 HTML、robots 和 sitemap，正式八页有 canonical；Contact/Terms 等新页按当前批准范围仍 noindex。可以将这个包的内容放到服务器名称仍为 `dist` 的发布目录，无需因目录名称改动构建脚本。

使用[已验证生产包](../../.ci/handoff/release-1793709636258-22f72176-site.tar.gz)，SHA256 为 `74ee594d3cdf1fe4924b7497bc2b38365d8615aa5fbc47a489a05020e653580f`。解压到新的空发布目录后应直接看到 `index.html`、`404.html`、`about/index.html`、`contact/index.html`、`terms/index.html`、`privacy/index.html` 和 `assets/`，不要多套一层 site 或 dist。

保留当前完整站点及旧 hash 资源供回滚，待确认实际目录与切换方法后再发布；不要混合覆盖 CSR 与 SSG 产物，也不要把 `.ci`、metadata 或仓库源码放进公开目录。包的完整验证与来源见[移交材料](adsense-handoff-2026-11-03.md)。

## Nginx 最小修正方向

先核对现有 HTTPS server 的 `server_name`、`root`/`alias`、`location`、`try_files` 和是否存在 `proxy_pass`。如果实际为静态目录托管，保留现有域名、证书及真实 root，只审阅替换 SPA 兜底的部分：

```nginx
index index.html;
error_page 404 /404.html;
location = /404.html { internal; }
location / {
    try_files $uri $uri/ =404;
}
```

未知路径不应使用 `/index.html` 兜底返回 200，404 页面也不应被 `error_page 404 =200` 改为成功状态。以上片段不是完整可直接覆盖的站点配置，必须与现有正则 location、缓存和其他代理规则一起审阅。若现有 server 使用 proxy_pass，先确认真正服务 HTML 的上游，再确定修改位置，不能直接假设 root 托管。

审批通过并明确实际文件后，在服务器先检查配置语法，语法通过后按现有管理方式重新加载。完整示例见[静态托管配置示例](nginx-static.example.conf)，其中路径不是已核实的服务器路径，本机未执行 nginx -t。

## 发布后验收

- `/contact/`、`/terms/`、`/privacy/`、`/about/` 返回 200，页面源码有正文，页脚四入口可用；七工具核心操作可用。
- 一个随机不存在的路径返回 HTTP 404，而不是仅在页面文字中显示“找不到页面”。
- `/` 等批准索引页的 HTML 源码及交互后 canonical 为 www HTTPS；sitemap 为当前八条 URL。不要期待默认 preview 构建自动具有正式 SEO。
- CSS/JS 正确加载、MIME 正确，无混合内容；根域 DNS 与根域证书/跳转另行核对，不能只靠 Nginx 修改解决 DNS 解析。

待补信息：现有 Nginx server 配置及实际发布目录。独立生产部署授权和广告启用仍未给出，本轮广告保持关闭。

## 负责人提供配置后的精确适配（2026-11-03）

已确认现有配置为 Nginx 静态 root 托管，不是 proxy_pass：`server_name www.v7luck.com`，`root /home/toxbox/dist`。原 `try_files $uri $uri/ /index.html` 为软 404 原因。原配置仅对 `/index.html` 设置禁止缓存，SSG 子页面也需要该策略。

已准备[精确替换片段](nginx-www.v7luck.com.locations.conf)：仅在现有 HTTPS server 中删除原 `location /` 和 `location = /index.html` 两块，再加入此片段。保留域名、`root /home/toxbox/dist`、index、TLS 参数、现有证书指令与 server 级 HSTS；不要新建重复的同域 server，不要覆盖未提供的证书设置。

片段使用 `try_files ... =404` 和 `error_page 404 /404.html`，不将状态重写为 200；404 文件只供内部错误页使用。HTML 缓存规则覆盖首页及 SSG 子页面。由于现有 Nginx 的 location 中定义 add_header 会影响父级头继承，在新增缓存规则处显式重复现有 HSTS，不使用仅新版本才支持的继承合并指令。

服务器实际操作顺序供负责人执行：

1. 保留当前站点配置和完整公开目录的回滚副本，按现有发布方法把已验证生产包内容放入 `/home/toxbox/dist`；不要把 CSR 和 SSG 两套文件混合覆盖，不要删除仍被旧页面引用的 hash 资源。
2. 确认 `/home/toxbox/dist/404.html`、`contact/index.html`、`terms/index.html` 等存在，并确认 Nginx 工作用户有目录遍历和文件读取权限。
3. 替换上述两个 location，执行 `sudo nginx -t`。只有成功后才执行 `sudo systemctl reload nginx`（适用于当前服务确由 systemd 管理的情况；否则使用原有服务管理方式）。本轮未代为执行。
4. 使用 GET 请求核对 `/contact/` 和 `/terms/` 返回 200，随机未知路径返回 404，直接请求 `/404.html` 同样返回 404；页面正文正常且有四个页脚入口。
5. 复核首页和子页面 HTML 的 Cache-Control 与 Strict-Transport-Security，JS/CSS 正常，根域 DNS 问题单独处理。

官方依据：[try_files / error_page](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)、[add_header 继承](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header)。本机未安装 Nginx，未执行 nginx -t 或验证服务器其他未提供的 location；交付为已按提供配置适配的替换片段，不宣称线上已修复。
