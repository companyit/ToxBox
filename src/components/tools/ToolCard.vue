<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Tool } from '@/types/tool'

const props = defineProps<{ tool: Tool }>()
const iconPaths = computed(() => {
  const id = props.tool.id
  if (id.includes('image')) return ['M4 5h16v14H4z', 'M4 15l5-5 5 5 3-3 3 3', 'M15 9h.01']
  if (id.includes('pdf') || id.includes('word')) return ['M6 3h8l4 4v14H6z', 'M14 3v5h4', 'M9 12h6M9 16h6']
  if (id.includes('date') || id.includes('timestamp')) return ['M5 5h14v16H5z', 'M8 3v4M16 3v4M5 10h14', 'M9 14h2M13 17h2']
  if (id === 'totp') return ['M12 3l8 3v6c0 5-8 9-8 9S4 17 4 12V6z', 'M8 12l3 3 5-6']
  if (id.includes('text') || id.includes('csv')) return ['M4 5h16M12 5v14M8 19h8', 'M5 10H3M21 10h-2']
  return ['M8 6l-6 6 6 6M16 6l6 6-6 6', 'M14 4l-4 16']
})

const categoryLabels = { office: '办公工具', developer: '开发者工具' }
</script>

<template>
  <article class="tool-card" :aria-labelledby="`tool-${tool.id}`">
    <div class="card-meta">
      <span class="tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path v-for="(path, index) in iconPaths" :key="index" :d="path" /></svg></span>
      <span class="category-label">{{ categoryLabels[tool.category] }}</span>
      <span v-if="tool.status === 'planned'" class="status">规划中</span>
    </div>
    <h3 :id="`tool-${tool.id}`">{{ tool.name }}</h3>
    <p>{{ tool.description }}</p>
    <p v-if="tool.status === 'planned'" class="availability">尚未开放使用</p>
    <p v-else class="availability"><RouterLink :to="{ name: tool.routeName }">打开工具<span class="sr-only">：{{ tool.name }}</span><span class="entry-arrow" aria-hidden="true">→</span></RouterLink></p>
  </article>
</template>

<style scoped>
.tool-card { display: flex; flex-direction: column; min-width: 0; height: 100%; padding: 20px 20px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--ui-panel-radius); box-shadow: var(--card-shadow); }
.card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; color: var(--color-muted); font-size: .75rem; }
.tool-icon { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-accent-soft); color: var(--color-accent); }
.tool-icon svg { width: 22px; height: 22px; }
.category-label { flex: 1; }
.status { font-size: .75rem; }
@media (prefers-reduced-motion: no-preference) { .tool-card { transition: border-color .16s, box-shadow .16s, transform .16s; } .tool-card:hover { transform: translateY(-2px); box-shadow: var(--card-hover-shadow); } }
h3 { margin-block: 12px 8px; font-size: 1.125rem; line-height: 1.5; }
p { color: var(--color-muted); font-size: .875rem; }
.availability { margin-top: auto; padding-top: 16px; }
.availability a { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; padding: 8px 12px; background: var(--color-accent-soft); border-radius: 8px; text-decoration: none; font-weight: 650; }
.entry-arrow { margin-left: 8px; font-size: 1.125rem; }
.availability a:hover { color: var(--color-on-accent); background: var(--color-accent); }
.tool-card:hover, .tool-card:focus-within { border-color: var(--color-accent); }
</style>
