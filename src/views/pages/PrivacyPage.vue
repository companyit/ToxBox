<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { site } from '@/data/site'
</script>
<template>
  <article class="page-content prose">
    <header class="page-heading"><h1 tabindex="-1">隐私政策</h1><p>说明工具内容、页面访问和外部服务各自的数据处理范围。</p><p>更新日期：{{ site.updatedAt }}</p></header>
    <h2>工具输入和结果</h2><p>日期计算、CSV/JSON 表格互转、文本整理、文本统计、JSON、URL、Base64、时间戳和 UUID 工具在浏览器本地处理，无需登录。应用不主动上传工具输入或结果，不将它们写入网址、日志、分析事件或浏览器持久化存储。内容仅在当前页面内存中，清空、离开或刷新后需重新输入，不提供云保存或历史记录。</p>
    <h2>2FA 密钥与验证码</h2><p>导入链接、账户信息、密钥和验证码只在当前页面内存中处理，不上传或保存。2FA 工具不加载 Google Analytics 或广告脚本；进入或离开时整页导航，以隔离其他页面已加载的第三方脚本。清空或离开会释放页面中的内容引用，但不承诺物理擦除设备内存；已复制的验证码需自行管理。</p>
    <h2>本地文档工具</h2><p>文本处理工作台（含替换参数）、文本差异对比、JSON/YAML 配置转换、图片压缩与格式转换、图片转 PDF、PDF 页面整理、PDF 合并、拆分/选页与 DOCX 简版转换只在本地 Worker 处理所选文件。文件名、文件字节、页数、选页表达式和转换正文不上传，不进入网址、日志、分析或存储。文档工具与 2FA 共用无第三方脚本的独立文档边界。清空、取消和离页终止任务并撤销结果链接；不承诺物理擦除内存。DOCX 打印使用浏览器系统对话框，本站不能确认最终保存位置或是否落盘。</p>
    <h2>搜索与剪贴板</h2><p>首页搜索词仅在页面内存中筛选工具名称和简介，不写入 URL、存储或应用分析事件。仅点击复制时请求写入剪贴板，本站不读取剪贴板；浏览器拒绝时提示手动复制。复制后的内容由设备、剪贴板或你粘贴到的应用管理。</p>
    <h2>静态资源和托管请求</h2><p>浏览网站需要请求页面、脚本、样式及图标。处理这些请求的托管、网络或安全服务可能接触 IP 地址、请求时间、浏览器信息及请求路径，并依据各自配置保留访问记录。这不等于工具输入上传。请不要把密钥或个人信息放入网址，也不要在使用外部链接时携带敏感内容。</p>
    <h2>Google Analytics 页面访问统计</h2><p>发布构建在正式域名启用 Google Analytics（G-FT0EKJ0B5K），用于了解访问情况。Google 可能使用 Cookie 或其他标识符，处理设备、浏览器及访问数据。应用主动发送的页面地址不含查询参数或片段，未知页面使用统一路径，不主动发送工具输入、结果或剪贴板内容。浏览器设置或内容拦截可能阻止统计；本地及其他域名不启用该统计。</p>
    <p>Google 的处理方式可参阅<a href="https://policies.google.com/privacy" rel="noopener noreferrer">Google 隐私政策</a>及<a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer">Google 在合作伙伴网站上的数据使用说明</a>。浏览器通常允许管理或删除 Cookie；删除 Cookie 不等于撤回已经发送的数据。</p>
    <h2>AdSense 广告准备</h2><p>本站正在准备 Google AdSense 接入，当前尚未加载 AdSense 广告脚本，也未由本轮功能设置广告 Cookie。这不代表已有 Analytics 不使用 Cookie。</p>
    <p>若未来启用 Google 广告，Google 及其他广告供应商可能利用 Cookie，根据用户对本站或其他网站的访问展示广告。届时会根据实际投放、供应商和适用地区更新披露，并落实所需同意管理。可通过<a href="https://myadcenter.google.com/" rel="noopener noreferrer">Google 广告设置</a>了解个性化广告控制；该链接不代表本站已启用广告或已经获得同意。</p>
    <h2>通过邮件联系我们</h2><p>你可自行发送邮件至 <a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a>。邮件正文、发件地址和附件由你选择的邮件服务及收件邮箱服务处理，用于沟通反馈或隐私请求，不属于浏览器工具的本地计算。请勿发送真实密钥、密码或私人文档；如需删除已发送的信息，可使用同一联系渠道提出请求。</p>
    <h2>政策更新与咨询</h2><p>数据处理或外部服务发生变化时会更新本页及日期。关于本站处理范围、纠错或隐私请求，请通过联系我们页面提供必要且尽可能少的信息。我们不会为此要求你提供 2FA 密钥或验证码。</p>
    <p><RouterLink :to="{ name: 'contact' }">联系我们</RouterLink> · <RouterLink :to="{ name: 'terms' }">服务条款</RouterLink></p>
  </article>
</template>
