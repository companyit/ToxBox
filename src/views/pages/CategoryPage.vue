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
  <div class="page-content">
    <nav class="breadcrumbs" aria-label="面包屑"><RouterLink :to="{ name: 'home' }">首页</RouterLink></nav>
    <header class="page-heading"><h1 tabindex="-1">{{ page.heading }}</h1><p>{{ page.description }}</p></header>
    <section aria-labelledby="category-tools"><h2 id="category-tools">可试用工具</h2>
      <ul class="category-grid"><li v-for="tool in tools.filter(t => t.category === category)" :key="tool.id"><ToolCard :tool="tool" /></li></ul>
    </section>
    <p class="related-tools"><RouterLink :to="{ name: category === 'office' ? 'developer' : 'office' }">浏览{{ category === 'office' ? '开发者' : '办公' }}工具</RouterLink></p>
  </div>
</template>
