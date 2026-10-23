<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ToolCard from '@/components/tools/ToolCard.vue'
import { tools } from '@/data/tools'
const categories = [
  { id: 'office-tools', category: 'office', title: '办公工具', description: '从文字整理开始，减少日常重复操作。' },
  { id: 'developer-tools', category: 'developer', title: '开发者工具', description: '面向数据与编码处理，让开发中的小事更简单。' },
] as const
</script>

<template>
  <section class="hero" aria-labelledby="home-title">
    <div class="hero-copy">
    <p class="eyebrow">WorkDev Tools · 办公与开发者在线工具</p>
    <h1 id="home-title" tabindex="-1">让日常工作，<br>轻松一点。</h1>
    <p class="hero-description">在浏览器里，找到顺手的办公与开发者工具。<br>免费、免登录，优先在本地处理数据。</p>
    <ul class="principles" aria-label="产品特点">
      <li>免费使用</li><li>无需登录</li><li>本地处理优先</li>
    </ul>
    <a class="browse-tools" href="#office-tools">浏览工具</a>
    <p class="release-note">文本统计、JSON 与 URL 编解码已提供独立试用页面。</p>
    </div>
    <aside class="hero-overview" aria-label="现有工具概览">
      <p class="eyebrow">在浏览器里，专注完成小事</p>
      <ul><li v-for="tool in tools" :key="tool.id"><strong>{{ tool.name }}</strong><span>{{ tool.description }}</span></li></ul>
      <p class="overview-note">三个核心工具 · 独立试用页面</p>
    </aside>
  </section>

  <div class="directory-sections">
  <section v-for="section in categories" :id="section.id" :key="section.id" class="tool-section" :class="section.category" :aria-labelledby="`${section.id}-title`">
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

  </div>

  <section class="tool-section migration-section" aria-labelledby="migration-title">
    <h2 id="migration-title">工具入口已迁移</h2>
    <p>原首页试用区域已移至独立工具页面，旧书签仍可在这里找到入口。</p>
    <div v-for="tool in tools" :key="tool.id">
      <p v-if="tool.status === 'preview'" :id="tool.routeName" class="migration-entry" tabindex="-1">
        {{ tool.name }}已移至独立工具页面。<RouterLink :to="{ name: tool.routeName }">打开{{ tool.name }}</RouterLink>
      </p>
    </div>
  </section>

  <section id="privacy" class="privacy-section" aria-labelledby="privacy-title">
    <p class="eyebrow">数据处理原则</p>
    <h2 id="privacy-title">你的内容，优先留在你的浏览器。</h2>
    <p>文本统计、JSON 与 URL 工具在浏览器本地处理，基础布局不采集工具输入。输入仅保存在当前页面内存中，离开工具页面或刷新后清空，不接入广告或分析服务。</p>
    <p><RouterLink :to="{ name: 'privacy' }">查看完整隐私说明</RouterLink></p>
  </section>
</template>

<style scoped>
.hero { display: grid; gap: 32px; align-items: center; padding-block: 48px; }
.hero-copy, .hero-overview { min-width: 0; }
.eyebrow { color: var(--color-accent); font-size: .875rem; font-weight: 650; }
h1 { margin-block: 16px; font-size: clamp(2.25rem, 4vw, 3.5rem); line-height: 1.18; letter-spacing: -.035em; }
.hero-description { color: var(--color-muted); font-size: 1.0625rem; }
.principles { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 20px; padding: 0; list-style: none; color: var(--color-muted); font-size: .875rem; }
.browse-tools { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; margin-top: 24px; padding: 8px 20px; border-radius: var(--ui-control-radius); background: var(--color-accent); color: var(--color-on-accent); text-decoration: none; font-weight: 650; }
.browse-tools:hover { text-decoration: underline; }
.release-note { margin-top: 12px; color: var(--color-muted); font-size: .875rem; }
.hero-overview { padding: 24px; background: var(--color-accent-soft); border: 1px solid var(--color-border); border-radius: var(--ui-panel-radius); }
.hero-overview ul { padding: 0; list-style: none; }
.hero-overview li { display: grid; gap: 4px; padding-block: 16px; border-bottom: 1px solid var(--color-border); }
.hero-overview li span, .overview-note { font-size: .875rem; color: var(--color-muted); }
.overview-note { margin-top: 16px; }
.directory-sections { display: grid; gap: 24px; }
.tool-section { min-width: 0; padding-block: 24px; }
.section-heading { margin-bottom: 24px; }
h2 { font-size: clamp(1.4rem, 3vw, 1.8rem); line-height: 1.4; }
.section-heading p { margin-top: 8px; color: var(--color-muted); }
.tool-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; padding: 0; list-style: none; }
.tool-grid li { min-width: 0; }
.office .tool-grid { max-width: 420px; }
.empty-state { padding: 24px; border: 1px dashed var(--color-border); border-radius: var(--ui-panel-radius); color: var(--color-muted); }
.migration-section { margin-top: 24px; border-top: 1px solid var(--color-border); font-size: .875rem; color: var(--color-muted); }
.migration-section h2 { margin-bottom: 12px; font-size: 1.125rem; color: var(--color-text); }
.privacy-section { margin-block: 24px 48px; padding: 24px; background: var(--color-accent-soft); border-radius: var(--ui-panel-radius); }
.privacy-section h2 { margin-block: 12px 16px; }
.privacy-section p:not(.eyebrow) { max-width: 48rem; margin-top: 12px; color: var(--color-muted); }
@media (min-width: 640px) { .developer .tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 960px) { .hero { grid-template-columns: 1.2fr 1fr; gap: 48px; padding-block: 56px; } }
@media (min-width: 1200px) { .directory-sections { grid-template-columns: repeat(3, minmax(0, 1fr)); } .developer { grid-column: span 2; } }
</style>
