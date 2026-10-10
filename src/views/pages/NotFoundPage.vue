<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
<template>
  <section class="page-content">
    <header class="page-heading"><p class="eyebrow">404</p><h1 tabindex="-1">页面不存在</h1><p>请求的页面不存在，请返回首页或浏览工具分类。</p></header>
    <p><RouterLink :to="{ name: 'home' }">返回首页</RouterLink> · <RouterLink :to="{ name: 'office' }">办公工具</RouterLink> · <RouterLink :to="{ name: 'developer' }">开发者工具</RouterLink></p>
  </section>
</template>
