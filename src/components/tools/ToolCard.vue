<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Tool } from '@/types/tool'

defineProps<{ tool: Tool }>()

const categoryLabels = { office: '办公工具', developer: '开发者工具' }
const statusLabels = { planned: '规划中', preview: '试用' }
</script>

<template>
  <article class="tool-card" :aria-labelledby="`tool-${tool.id}`">
    <div class="card-meta">
      <span>{{ categoryLabels[tool.category] }}</span>
      <span class="status">{{ statusLabels[tool.status] }}</span>
    </div>
    <h3 :id="`tool-${tool.id}`">{{ tool.name }}</h3>
    <p>{{ tool.description }}</p>
    <p v-if="tool.status === 'planned'" class="availability">尚未开放使用</p>
    <p v-else class="availability"><RouterLink :to="{ name: tool.routeName }">试用工具<span class="sr-only">：{{ tool.name }}</span><span class="entry-arrow" aria-hidden="true">→</span></RouterLink></p>
  </article>
</template>

<style scoped>
.tool-card { display: flex; flex-direction: column; min-width: 0; height: 100%; padding: 20px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; }
.card-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; color: var(--color-muted); font-size: .75rem; }
.status { font-size: .75rem; }
h3 { margin-block: 12px 8px; font-size: 1.125rem; line-height: 1.5; }
p { color: var(--color-muted); font-size: .875rem; }
.availability { margin-top: auto; padding-top: 12px; }
.availability a { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 0; border-radius: 4px; text-decoration: none; font-weight: 650; }
.entry-arrow { margin-left: 8px; }
.availability a:hover { color: var(--color-text); }
.tool-card:hover, .tool-card:focus-within { border-color: var(--color-accent); }
</style>
