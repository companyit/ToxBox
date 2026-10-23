<script setup lang="ts">
import { inject, ref } from 'vue'
import { interactionReadyKey } from '@/interactionReady'
const ready = inject(interactionReadyKey, ref(false))
import { RouterLink } from 'vue-router'
import { getPage } from '@/data/pages'
import type { ToolPageName } from '@/data/pages'
import { tools } from '@/data/tools'
const props = defineProps<{ pageName: ToolPageName }>()
const page = getPage(props.pageName)
const category = props.pageName === 'text-statistics' ? 'office' : 'developer'
</script>
<template>
  <div class="page-content tool-page">
    <nav class="breadcrumbs" aria-label="面包屑">
      <RouterLink :to="{ name: 'home' }">首页</RouterLink><span aria-hidden="true"> / </span>
      <RouterLink :to="{ name: category }">{{ category === 'office' ? '办公工具' : '开发者工具' }}</RouterLink>
    </nav>
    <header class="page-heading"><h1 tabindex="-1">{{ page.heading }}</h1><p>{{ page.description }}</p></header>
    <fieldset class="hydration-controls" :disabled="!ready" aria-label="工具操作"><slot /></fieldset>
    <aside class="related-tools" aria-labelledby="related-heading">
      <h2 id="related-heading">相关工具</h2>
      <ul><template v-for="tool in tools" :key="tool.id"><li v-if="tool.status === 'preview' && tool.routeName !== pageName"><RouterLink :to="{ name: tool.routeName }">{{ tool.name }}</RouterLink></li></template></ul>
      <p><RouterLink :to="{ name: 'privacy' }">查看隐私说明</RouterLink> · 离开页面后清除工具输入，不自动保存。</p>
    </aside>
  </div>
</template>

<style scoped>
.hydration-controls { border: 0; padding: 0; margin: 0; min-width: 0; }
.tool-page { min-width: 0; }
.tool-page .page-heading { max-width: var(--layout-prose-width); }
.tool-page .related-tools { font-size: .875rem; }
</style>
