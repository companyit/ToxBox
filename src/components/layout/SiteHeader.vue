<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BrandMark from '@/components/brand/BrandMark.vue'
import { site } from '@/data/site'
const route = useRoute()
const header = ref<HTMLElement | null>(null)
let observer: ResizeObserver | undefined
onMounted(() => {
  const updateHeight = () => {
    if (header.value) document.documentElement.style.setProperty('--site-header-height', `${header.value.getBoundingClientRect().height}px`)
  }
  updateHeight()
  observer = new ResizeObserver(updateHeight)
  if (header.value) observer.observe(header.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.documentElement.style.removeProperty('--site-header-height')
})
function focusMain() {
  document.getElementById('main-content')?.focus()
}
</script>

<template>
  <a class="skip-link" href="#main-content" @click="focusMain">跳转到主内容</a>
  <header ref="header" id="top" class="site-header">
    <div class="container header-content">
      <RouterLink class="brand" :to="{ name: 'home' }" :aria-label="`${site.displayName}，返回首页`">
        <span class="brand-mark" aria-hidden="true"><BrandMark /></span>
        <span class="brand-name">{{ site.name }}<small>{{ site.englishName }}</small></span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink :to="{ name: 'office' }" :aria-current="['image-crop', 'pdf-organizer', 'text-workbench', 'text-diff', 'image-convert', 'images-to-pdf', 'date-calculator', 'office', 'text-statistics', 'text-cleanup', 'csv-json', 'pdf-merge', 'word-to-pdf', 'pdf-split'].includes(String(route.name)) ? 'page' : undefined">办公工具</RouterLink>
        <RouterLink :to="{ name: 'developer' }" :aria-current="['developer', 'json-yaml', 'json-formatter', 'url-encoder', 'totp', 'base64', 'timestamp', 'uuid'].includes(String(route.name)) ? 'page' : undefined">开发者工具</RouterLink>
        <RouterLink :to="{ name: 'privacy' }">隐私说明</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header-content { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-4); padding-block: 12px; }
.brand { display: inline-flex; align-items: center; min-height: 44px; gap: var(--space-3); color: var(--color-text); font-weight: 750; text-decoration: none; }
.brand-mark { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; flex-shrink: 0; color: var(--color-accent); }
.brand-name { display: grid; gap: 1px; line-height: 1.25; font-size: 1rem; }
.brand-name small { font-size: .6875rem; font-weight: 600; color: var(--color-muted); letter-spacing: .025em; }
nav { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); }
nav a { display: inline-flex; align-items: center; min-height: 44px; padding: 8px; border-radius: var(--ui-control-radius); color: var(--color-muted); text-decoration: none; }
nav a:hover { color: var(--color-accent); background: var(--color-accent-soft); }
@media (max-width: 639px) { nav { width: 100%; gap: 8px; } .header-content { gap: 8px; } }
@media (min-width: 360px) and (max-width: 639px) {
  .header-content { column-gap: 8px; }
  .brand { gap: 8px; }
  .brand-name { font-size: .875rem; }
  nav { width: auto; gap: 0; }
  nav a { font-size: .8125rem; padding-inline: 6px; }
}
</style>
