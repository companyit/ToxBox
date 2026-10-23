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
    <p v-else class="availability"><RouterLink :to="{ name: tool.routeName }">试用工具<span class="sr-only">：{{ tool.name }}</span></RouterLink></p>
  </article>
</template>

<style scoped>
.tool-card { display: flex; flex-direction: column; min-width: 0; height: 100%; padding: 24px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); }
.card-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); color: var(--color-muted); font-size: 0.8125rem; }
.status { padding: 0.2rem 0.65rem; border-radius: 999px; background: var(--color-accent-soft); color: var(--color-accent); font-weight: 600; }
h3 { margin-block: var(--space-5) var(--space-2); font-size: 1.125rem; }
p { color: var(--color-muted); }
.availability { margin-top: auto; padding-top: 24px; font-size: 0.8125rem; }
.availability a { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); text-decoration: none; font-weight: 650; }
.availability a:hover { border-color: var(--color-accent); background: var(--color-accent-soft); }
.tool-card:hover { border-color: var(--color-accent); }
</style>
