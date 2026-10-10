<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
const route = useRoute()
function focusMain() {
  document.getElementById('main-content')?.focus()
}
</script>

<template>
  <a class="skip-link" href="#main-content" @click="focusMain">跳转到主内容</a>
  <header id="top" class="site-header">
    <div class="container header-content">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="WorkDev Tools，返回首页">
        <span class="brand-mark" aria-hidden="true">W</span>
        <span>WorkDev Tools</span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink :to="{ name: 'office' }" :aria-current="['office', 'text-statistics'].includes(String(route.name)) ? 'page' : undefined">办公工具</RouterLink>
        <RouterLink :to="{ name: 'developer' }" :aria-current="['developer', 'json-formatter', 'url-encoder'].includes(String(route.name)) ? 'page' : undefined">开发者工具</RouterLink>
        <RouterLink :to="{ name: 'privacy' }">隐私说明</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header-content { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); padding-block: var(--space-5); }
.brand { display: inline-flex; align-items: center; gap: var(--space-3); color: var(--color-text); font-weight: 750; text-decoration: none; }
.brand-mark { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; flex-shrink: 0; border-radius: var(--radius-small); color: var(--color-on-accent); background: var(--color-accent); }
nav { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); }
nav a { padding-block: var(--space-2); color: var(--color-muted); text-decoration: none; }
nav a:hover { color: var(--color-accent); text-decoration: underline; }
</style>
