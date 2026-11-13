<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ToolCard from '@/components/tools/ToolCard.vue'
import { tools } from '@/data/tools'
import { getPage } from '@/data/pages'
import type { ToolCategory } from '@/types/tool'
const props = defineProps<{ category: ToolCategory }>()
const page = getPage(props.category)
</script>
<template>
  <div class="page-content category-directory" :class="`category-directory--${category}`">
    <nav class="breadcrumbs" aria-label="面包屑"><RouterLink :to="{ name: 'home' }">首页</RouterLink></nav>
    <header class="page-heading"><h1 tabindex="-1">{{ page.heading }}</h1><p>{{ page.description }}</p></header>
    <section aria-labelledby="category-tools"><div class="directory-heading"><h2 id="category-tools">在线工具目录</h2><span>{{ tools.filter(t => t.category === category).length }} 个工具</span></div>
      <ul class="category-grid"><li v-for="tool in tools.filter(t => t.category === category)" :key="tool.id"><ToolCard :tool="tool" /></li></ul>
    </section>
  </div>
</template>

<style scoped>
.directory-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; }
.directory-heading span { color: var(--color-muted); font-size: .875rem; }
.category-grid { grid-template-columns: minmax(0, 1fr); gap: 16px; max-width: none; }
@media (min-width: 640px) { .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1280px) { .category-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
</style>
