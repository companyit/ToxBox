<script setup lang="ts">
function focusMain() {
  document.getElementById('main-content')?.focus()
}
</script>

<template>
  <a class="skip-link" href="#main-content" @click="focusMain">跳转到主内容</a>
  <header id="top" class="site-header">
    <div class="container header-content">
      <a class="brand" href="#top" aria-label="WorkDev Tools，返回页首">
        <span class="brand-mark" aria-hidden="true">W</span>
        <span>WorkDev Tools</span>
      </a>
      <nav aria-label="主导航">
        <a href="#office-tools">办公工具</a>
        <a href="#developer-tools">开发者工具</a>
        <a href="#privacy">隐私说明</a>
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
