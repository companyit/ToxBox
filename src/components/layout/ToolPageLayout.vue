<script setup lang="ts">
import { inject, ref } from 'vue'
import { interactionReadyKey } from '@/interactionReady'
const ready = inject(interactionReadyKey, ref(false))
import { RouterLink } from 'vue-router'
import { getPage } from '@/data/pages'
import type { ToolPageName } from '@/data/pages'
import { toolGuides } from '@/data/toolGuides'
const props = defineProps<{ pageName: ToolPageName }>()
const page = getPage(props.pageName)
const guide = toolGuides[props.pageName]
const category = ['image-crop', 'pdf-organizer', 'text-workbench', 'text-diff', 'image-convert', 'images-to-pdf', 'date-calculator', 'csv-json', 'text-cleanup', 'text-statistics', 'pdf-merge', 'word-to-pdf', 'pdf-split'].includes(props.pageName) ? 'office' : 'developer'
</script>
<template>
  <div class="page-content tool-page">
    <nav class="breadcrumbs" aria-label="面包屑">
      <RouterLink :to="{ name: 'home' }">首页</RouterLink><span aria-hidden="true"> / </span>
      <RouterLink :to="{ name: category }">{{ category === 'office' ? '办公工具' : '开发者工具' }}</RouterLink>
    </nav>
    <header class="page-heading"><h1 tabindex="-1">{{ page.heading }}</h1><p>{{ page.description }}</p></header>
    <fieldset class="hydration-controls" :disabled="!ready" aria-label="工具操作"><slot /></fieldset>
    <section class="tool-guide" aria-labelledby="guide-heading">
      <h2 id="guide-heading">使用指南</h2>
      <p>{{ guide.scenario }}</p>
      <h3>使用步骤</h3><ol><li v-for="step in guide.steps" :key="step">{{ step }}</li></ol>
      <h3>示例解读</h3><p><strong>输入或选择：</strong>{{ guide.example.input }}</p><p><strong>结果：</strong>{{ guide.example.result }}</p><p>{{ guide.example.explanation }}</p>
      <h3>注意事项</h3><ul><li v-for="caution in guide.cautions" :key="caution">{{ caution }}</li></ul>
      <h3>常见问题</h3><div v-for="item in guide.questions" :key="item.question"><h4>{{ item.question }}</h4><p>{{ item.answer }}</p></div>
    </section>
    <p class="tool-privacy"><RouterLink :to="{ name: 'privacy' }">查看隐私说明</RouterLink> · 离开页面后清除工具输入，不自动保存。</p>
  </div>
</template>

<style scoped>
.hydration-controls { border: 0; padding: 0; margin: 0; min-width: 0; }
.tool-page { min-width: 0; }
.tool-guide { margin-block: 32px; padding-block: 24px; border-top: 1px solid var(--color-border); max-width: var(--layout-prose-width); overflow-wrap: anywhere; line-height: 1.8; }
.tool-guide h2 { font-size: 1.5rem; margin-bottom: 16px; }
.tool-guide h3 { font-size: 1.125rem; margin-top: 24px; }
.tool-guide h4 { font-size: 1rem; margin-top: 16px; }
.tool-guide p, .tool-guide ol, .tool-guide ul { margin-top: 12px; }
.tool-guide li + li { margin-top: 8px; }
.tool-page .page-heading { max-width: var(--layout-prose-width); }
.tool-privacy { font-size: .875rem; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--color-border); }
.hydration-controls :deep(input[type="file"]) { min-height: 44px; width: 100%; min-width: 0; max-width: 100%; color: var(--color-muted); font: inherit; }
.hydration-controls :deep(input[type="file"]::file-selector-button) { min-height: 44px; margin-right: 12px; padding: 8px 16px; background: var(--color-surface); border: 1px solid var(--color-muted); border-radius: var(--ui-control-radius); color: var(--color-text); font: inherit; cursor: pointer; }
.hydration-controls :deep(input[type="file"]:disabled) { opacity: .6; }
.hydration-controls :deep(input[type="file"]:focus-visible) { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
