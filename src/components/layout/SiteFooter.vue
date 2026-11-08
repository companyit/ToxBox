<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BrandMark from '@/components/brand/BrandMark.vue'
import { site } from '@/data/site'
</script>
<template>
  <footer class="site-footer">
    <div class="container footer-content">
      <div class="footer-identity"><span class="footer-brand"><span class="footer-mark"><BrandMark /></span><span>{{ site.name }}<small>{{ site.englishName }}</small></span></span>
      <p>为日常办公与开发，准备顺手的小工具。</p></div>
      <nav aria-label="页脚导航"><RouterLink :to="{ name: 'about' }">关于我们</RouterLink> <RouterLink :to="{ name: 'contact' }">联系我们</RouterLink> <RouterLink :to="{ name: 'privacy' }">隐私政策</RouterLink> <RouterLink :to="{ name: 'terms' }">服务条款</RouterLink></nav>
    </div>
  </footer>
</template>

<style scoped>
.footer-content { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3); padding-block: var(--space-6); color: var(--color-muted); font-size: 0.875rem; }
.footer-mark { width: 28px; height: 28px; flex-shrink: 0; }
.footer-brand small { display: block; font-size: .6875rem; color: var(--color-muted); }
.footer-brand { display: flex; align-items: center; gap: 8px; line-height: 1.4; color: var(--color-text); font-weight: 700; }
nav { display: flex; flex-wrap: wrap; gap: 16px; }
nav a { display: inline-flex; align-items: center; min-height: 44px; }
.footer-identity { min-width: 0; }
.footer-content { align-items: center; padding-block: 24px; gap: 16px; }
</style>
