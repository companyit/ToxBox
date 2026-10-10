<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
<template>
  <article class="page-content prose">
    <header class="page-heading"><h1 tabindex="-1">关于 WorkDev Tools</h1><p>为办公与开发中的日常小事，提供顺手的浏览器工具。</p></header>
    <h2>当前工具</h2><p>文本统计、JSON 格式化与校验、URL 编解码免费免登录，输入在浏览器本地处理。工具处于试用阶段，具体规则和限制见各工具页面。</p>
    <h2>产品原则</h2><p>优先优化使用体验、可访问性和性能，不自动保存工具内容，不接入广告或分析平台。</p>
    <p><RouterLink :to="{ name: 'office' }">办公工具</RouterLink> · <RouterLink :to="{ name: 'developer' }">开发者工具</RouterLink> · <RouterLink :to="{ name: 'privacy' }">隐私说明</RouterLink></p>
  </article>
</template>
