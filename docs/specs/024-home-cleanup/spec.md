# 024 首页清理与旧书签兼容

日期：2026-11-07。负责人在“移除迁移块、旧锚点自动跳对应工具页”的具体建议后确认“可以清理了，完善页面整洁度”，本轮据此授权实现和本地验证。关联022，替代此前保留可见迁移区的要求，其余布局/功能边界继续有效。

- HOME-01：彻底移除首页“工具入口已迁移”标题、说明、14项重复入口及专属CSS，不用display:none保留重复DOM；正常目录仍14工具、办公8/开发6，搜索/品牌/隐私及页脚不变。
- HOME-02：根路径旧工具hash按原tool.routeName精确映射全部14工具。如/#json-formatter到/developer/json-formatter/，/#totp到/developer/2fa/。只允许当前已开放工具，不将任意fragment拼成URL。支持合法URI编码，畸形/未知hash保留首页，不跳外站。
- HOME-03：旧工具hash跳转使用location.replace完整文档导航，清除旧hash且不把query转传工具；初次加载在mount/hydration/统计启动前处理，避免把首页SSG正文hydrate成工具。已挂载应用内导航到旧首页hash也走同样完整文档替换，尤其2FA/PDF/DOCX不继承普通页文档。正常卡片/路由行为保持。
- HOME-04：/#office-tools、/#developer-tools、/#privacy仍为首页分区定位；非根路径的同名hash不转换，未知路径仍404。旧hash在无JavaScript时仅能看到精简首页和普通目录，不承诺服务端HTTP重定向，因为fragment不会随HTTP请求发送。
- HOME-05：保持首页1/2/3列、首屏搜索与桌面首排入口、明暗主题、44px点击范围、旧输入/文件/复制/敏感隔离、14工具/22HTML/14指南与正式八页索引和广告关闭。仅删除无用展示/说明和相关死样式，不扩展其他功能。
- HOME-06：纯映射单元测试、首页静态DOM断言、双引擎全14旧hash/分区hash/未知和畸形hash/不转传query/同文档到敏感页隔离、无hydration mismatch，以及原完整回归实际通过后记录。负责人视觉签收/真机等缺口保留，发布不包含本轮。
