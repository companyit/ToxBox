<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { tools } from '@/data/tools'
import { site } from '@/data/site'
</script>
<template>
  <article class="page-content prose">
    <header class="page-heading"><h1 tabindex="-1">关于{{ site.name }}</h1><p>为办公与开发中的日常小事，提供顺手的浏览器工具。</p></header>
    <h2>我们想解决的问题</h2><p>整理一段文本、检查 JSON、转换编码或核对时间，通常只需要一个直接、清楚的小工具。{{ site.displayName }} 把这些常见操作放在独立页面，说明处理规则和限制，帮助你在复制结果前判断它是否符合预期。</p>
    <h2>当前可以使用的工具</h2>
    <ul><li v-for="tool in tools" :key="tool.id"><template v-if="tool.status === 'preview'"><RouterLink :to="{ name: tool.routeName }">{{ tool.name }}</RouterLink>：{{ tool.description }}</template></li></ul>
    <h2>怎样对待你的内容</h2><p>工具免费免登录，输入和结果默认只在当前页面内存中处理，不上传到后端，也不自动保存历史。复制由你主动触发；刷新或离开后需重新输入。2FA 页面采用独立文档隔离，不加载分析或广告脚本。</p>
    <p>加载页面会产生静态资源请求，正式站点使用 Google Analytics 统计页面访问。这些请求与工具内容的本地处理是不同的边界，详细说明见隐私政策。</p>
    <h2>内容和维护</h2><p>各工具配有针对实际功能编写的使用步骤、示例解读和常见问题。本站不把编码结果、随机标识符或格式校验当作业务正确性的保证。发现错误或需要新功能时，欢迎提供不包含敏感信息的反馈。</p>
    <h2>网站如何持续维护</h2><p>目前不向用户收费，正在准备通过 Google AdSense 支持后续维护。本轮尚未加载 AdSense 广告；未来启用时会更新隐私说明，并保持工具操作与广告清楚区分。</p>
    <p><RouterLink :to="{ name: 'contact' }">联系我们</RouterLink> · <RouterLink :to="{ name: 'privacy' }">隐私政策</RouterLink> · <RouterLink :to="{ name: 'terms' }">服务条款</RouterLink></p>
  </article>
</template>
