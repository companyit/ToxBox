<script setup lang="ts">
import { nextTick, ref } from 'vue'
import TextStatisticsView from '@/views/TextStatisticsView.vue'
import JsonFormatterView from '@/views/JsonFormatterView.vue'
import ToolCard from '@/components/tools/ToolCard.vue'
import { tools } from '@/data/tools'
import type { ToolCategory } from '@/types/tool'

const toolOpen = ref(false)
const toolToggle = ref<HTMLButtonElement | null>(null)
async function toggleTextTool() {
  toolOpen.value = !toolOpen.value
  await nextTick()
  toolToggle.value?.focus()
}

const jsonOpen = ref(false)
const jsonToggle = ref<HTMLButtonElement | null>(null)
async function toggleJsonTool() {
  jsonOpen.value = !jsonOpen.value
  await nextTick()
  jsonToggle.value?.focus()
}

const categories: readonly { id: string; category: ToolCategory; title: string; description: string }[] = [
  { id: 'office-tools', category: 'office', title: '办公工具', description: '从文字整理开始，减少日常重复操作。' },
  { id: 'developer-tools', category: 'developer', title: '开发者工具', description: '面向数据与编码处理，让开发中的小事更简单。' },
]
</script>

<template>
  <section class="hero" aria-labelledby="home-title">
    <p class="eyebrow">WorkDev Tools · 办公与开发者在线工具</p>
    <h1 id="home-title">让日常工作，<br>轻松一点。</h1>
    <p class="hero-description">在浏览器里，找到顺手的办公与开发者工具。<br>免费、免登录，优先在本地处理数据。</p>
    <ul class="principles" aria-label="产品特点">
      <li>免费使用</li><li>无需登录</li><li>本地处理优先</li>
    </ul>
    <p class="release-note">文本统计与 JSON 工具已提供本页试用，更多工具正在准备中。</p>
  </section>

  <section v-for="section in categories" :id="section.id" :key="section.id" class="tool-section" :aria-labelledby="`${section.id}-title`">
    <div class="section-heading">
      <h2 :id="`${section.id}-title`">{{ section.title }}</h2>
      <p>{{ section.description }}</p>
    </div>
    <ul v-if="tools.some(tool => tool.category === section.category)" class="tool-grid">
      <li v-for="tool in tools.filter(tool => tool.category === section.category)" :key="tool.id">
        <ToolCard :tool="tool" />
      </li>
    </ul>
    <p v-else class="empty-state">暂无工具，敬请期待</p>
  </section>

  <section id="text-statistics" class="tool-section" aria-labelledby="text-statistics-title">
    <div class="section-heading">
      <h2 id="text-statistics-title">文本统计</h2>
      <p>本页试用 · 输入文本，实时查看字符、词段与行数。</p>
    </div>
    <button ref="toolToggle" class="tool-toggle" type="button" :aria-expanded="toolOpen" aria-controls="text-statistics-panel" @click="toggleTextTool">
      {{ toolOpen ? '收起工具并清空文本' : '展开文本统计' }}
    </button>
    <div id="text-statistics-panel" :hidden="!toolOpen">
      <TextStatisticsView v-if="toolOpen" />
    </div>
  </section>

  <section id="json-formatter" class="tool-section" aria-labelledby="json-formatter-title">
    <div class="section-heading">
      <h2 id="json-formatter-title">JSON 格式化与校验</h2>
      <p>本页试用 · 校验语法、格式化或压缩 JSON，注意数字精度与重复键限制。</p>
    </div>
    <button ref="jsonToggle" class="tool-toggle" type="button" :aria-expanded="jsonOpen" aria-controls="json-formatter-panel" @click="toggleJsonTool">
      {{ jsonOpen ? '收起 JSON 工具并清空内容' : '展开 JSON 工具' }}
    </button>
    <div id="json-formatter-panel" :hidden="!jsonOpen">
      <JsonFormatterView v-if="jsonOpen" />
    </div>
  </section>

  <section id="privacy" class="privacy-section" aria-labelledby="privacy-title">
    <p class="eyebrow">数据处理原则</p>
    <h2 id="privacy-title">你的内容，优先留在你的浏览器。</h2>
    <p>文本统计与 JSON 工具在浏览器本地处理，基础布局不采集工具输入。输入仅保存在当前页面内存中，收起工具或刷新后清空，不接入广告或分析服务。</p>
    <p>后续工具上线时，将分别说明处理范围与使用限制。</p>
  </section>
</template>

<style scoped>
.tool-toggle { min-height: 44px; padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-small); background: var(--color-surface); color: var(--color-accent); font: inherit; cursor: pointer; }
.hero { padding-block: clamp(3rem, 8vw, 6rem); }
.eyebrow { color: var(--color-accent); font-size: 0.875rem; font-weight: 650; }
h1 { margin-block: var(--space-5); font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.18; letter-spacing: -0.035em; }
.hero-description { max-width: 42rem; color: var(--color-muted); font-size: 1.125rem; }
.principles { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-6); padding: 0; list-style: none; }
.principles li { padding: var(--space-2) var(--space-3); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-small); font-size: 0.875rem; }
.release-note { margin-top: var(--space-5); color: var(--color-muted); font-size: 0.875rem; }
.tool-section { padding-block: var(--space-6) var(--space-8); }
.section-heading { margin-bottom: var(--space-5); }
h2 { font-size: clamp(1.4rem, 3vw, 1.8rem); line-height: 1.4; }
.section-heading p { margin-top: var(--space-2); color: var(--color-muted); }
.tool-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-5); padding: 0; list-style: none; }
.tool-grid li { min-width: 0; }
.empty-state { padding: var(--space-6); border: 1px dashed var(--color-border); border-radius: var(--radius-card); color: var(--color-muted); }
.privacy-section { margin-block: var(--space-6) var(--space-8); padding: clamp(1.5rem, 4vw, 3rem); background: var(--color-accent-soft); border-radius: var(--radius-card); }
.privacy-section h2 { margin-block: var(--space-3) var(--space-4); }
.privacy-section p:not(.eyebrow) { max-width: 48rem; margin-top: var(--space-3); color: var(--color-muted); }
@media (min-width: 640px) { .tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .tool-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
