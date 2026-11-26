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
const hasOwnWorkspace = ['ndjson', 'base64', 'uuid', 'timestamp', 'url-query', 'regex-tester'].includes(props.pageName)
const guide = toolGuides[props.pageName]
const category = ['image-crop', 'pdf-organizer', 'text-workbench', 'text-diff', 'file-diff', 'image-convert', 'images-to-pdf', 'date-calculator', 'csv-json', 'text-cleanup', 'text-statistics', 'pdf-merge', 'word-to-pdf', 'pdf-split'].includes(props.pageName) ? 'office' : 'developer'
</script>
<template>
  <div class="page-content tool-page">
    <div class="tool-topline">
      <nav class="breadcrumbs" aria-label="面包屑">
        <RouterLink :to="{ name: 'home' }">首页</RouterLink><span aria-hidden="true"> / </span>
        <RouterLink :to="{ name: category }">{{ category === 'office' ? '办公工具' : '开发者工具' }}</RouterLink>
      </nav>
      <a class="tool-jump" href="#tool-guide">查看使用指南</a>
    </div>
    <header class="page-heading">
      <h1 tabindex="-1">{{ page.heading }}</h1>
      <p>{{ page.description }}</p>
    </header>
    <fieldset
      id="tool-operation"
      class="hydration-controls"
      :class="{ 'tool-operation-panel': !hasOwnWorkspace }"
      :disabled="!ready"
      tabindex="-1"
      aria-label="工具操作"
    ><slot /></fieldset>
    <section id="tool-guide" class="tool-guide" tabindex="-1" aria-labelledby="guide-heading">
      <div class="guide-header">
        <h2 id="guide-heading">使用指南</h2>
        <a class="tool-jump" href="#tool-operation">返回工具操作</a>
      </div>
      <p>{{ guide.scenario }}</p>
      <div class="guide-grid">
        <div class="guide-block">
          <h3>使用步骤</h3>
          <ol><li v-for="step in guide.steps" :key="step">{{ step }}</li></ol>
        </div>
        <div class="guide-block">
          <h3>示例解读</h3>
          <p><strong>输入或选择：</strong>{{ guide.example.input }}</p>
          <p><strong>结果：</strong>{{ guide.example.result }}</p>
          <p>{{ guide.example.explanation }}</p>
        </div>
        <div class="guide-block">
          <h3>注意事项</h3>
          <ul><li v-for="caution in guide.cautions" :key="caution">{{ caution }}</li></ul>
        </div>
        <div class="guide-block">
          <h3>常见问题</h3>
          <div v-for="item in guide.questions" :key="item.question">
            <h4>{{ item.question }}</h4><p>{{ item.answer }}</p>
          </div>
        </div>
      </div>
    </section>
    <div class="tool-privacy">
      <p>离开页面后清除工具输入，不自动保存。</p>
      <RouterLink class="tool-jump" :to="{ name: 'privacy' }">查看隐私说明</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.hydration-controls { border: 0; padding: 0; margin: 0; min-width: 0; }
.tool-page { min-width: 0; }
.tool-operation-panel {
  padding: clamp(10px, 2vw, 20px);
  border: 1px solid var(--color-border);
  border-radius: var(--ui-card-radius, 20px);
  background: var(--color-surface);
}
@media (max-width: 359px) {
  .tool-operation-panel { padding-inline: 0; border-inline: 0; background: transparent; }
}
.tool-page :is(#tool-operation, #tool-guide):focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}
.tool-topline, .tool-privacy {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}
.tool-jump {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--ui-control-radius);
  background: var(--color-surface);
  font-size: .875rem;
  font-weight: 650;
}
.tool-jump:hover { border-color: var(--color-accent); background: var(--color-accent-soft); }
.tool-guide {
  margin-block: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  overflow-wrap: anywhere;
  line-height: 1.65;
}
.guide-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
.guide-header h2 { font-size: 1.5rem; }
.guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 26rem), 1fr)); gap: 12px; margin-top: 16px; }
.guide-block {
  min-width: 0;
  padding: clamp(12px, 2vw, 20px);
  border: 1px solid var(--color-border);
  border-radius: var(--ui-control-radius);
  background: var(--color-surface);
}
.guide-block h3 { font-size: 1.125rem; }
.guide-block h4 { font-size: 1rem; margin-top: 12px; }
.guide-block p, .guide-block ol, .guide-block ul { margin: 8px 0 0; }
.guide-block :is(ol, ul) { padding-inline-start: 1.4rem; }
.guide-block li + li { margin-top: 8px; }
.tool-page .page-heading { max-width: var(--layout-prose-width); margin-block: 12px 24px; }
.tool-page .page-heading h1 { font-size: clamp(1.75rem, 3vw, 2.25rem); margin-bottom: 8px; }
.breadcrumbs { font-size: .875rem; }
.tool-privacy { font-size: .875rem; margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--color-border); }
.hydration-controls :deep(input[type="file"]) { min-height: 44px; width: 100%; min-width: 0; max-width: 100%; color: var(--color-muted); font: inherit; }
.hydration-controls :deep(input[type="file"]::file-selector-button) { min-height: 44px; margin-right: 12px; padding: 8px 16px; background: var(--color-surface); border: 1px solid var(--color-muted); border-radius: var(--ui-control-radius); color: var(--color-text); font: inherit; cursor: pointer; }
.hydration-controls :deep(input[type="file"]:disabled) { opacity: .6; }
.hydration-controls :deep(input[type="file"]:focus-visible) { outline: 3px solid var(--color-focus); outline-offset: 3px; }
@media print {
  .tool-jump, .tool-guide, .tool-privacy { display: none; }
  .tool-operation-panel { padding: 0; border: 0; background: transparent; }
}
</style>
