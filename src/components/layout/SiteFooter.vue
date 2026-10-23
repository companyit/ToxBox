<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
<template>
  <footer class="site-footer">
    <div class="container footer-content">
      <div class="footer-identity"><span class="footer-brand">WorkDev Tools</span>
      <p>为日常办公与开发，准备顺手的小工具。</p></div>
      <nav aria-label="页脚导航"><RouterLink :to="{ name: 'about' }">关于</RouterLink> <RouterLink :to="{ name: 'privacy' }">隐私说明</RouterLink></nav>
    </div>
  </footer>
</template>

<style scoped>
.footer-content { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-6); color: var(--color-muted); font-size: 0.875rem; }
.footer-brand { color: var(--color-text); font-weight: 700; }
nav { display: flex; flex-wrap: wrap; gap: 16px; }
nav a { display: inline-flex; align-items: center; min-height: 44px; }
.footer-identity { min-width: 0; }
.footer-content { align-items: center; padding-block: 24px; gap: 16px; }
</style>
