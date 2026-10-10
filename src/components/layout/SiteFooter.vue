<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
<template>
  <footer class="site-footer">
    <div class="container footer-content">
      <span class="footer-brand">WorkDev Tools</span>
      <p>为日常办公与开发，准备顺手的小工具。</p>
      <nav aria-label="页脚导航"><RouterLink :to="{ name: 'about' }">关于</RouterLink> · <RouterLink :to="{ name: 'privacy' }">隐私说明</RouterLink></nav>
    </div>
  </footer>
</template>

<style scoped>
.footer-content { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-6); color: var(--color-muted); font-size: 0.875rem; }
.footer-brand { color: var(--color-text); font-weight: 700; }
</style>
