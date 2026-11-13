<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { interactionReadyKey } from '@/interactionReady'
import { searchTools } from '@/utils/toolSearch'
import { RouterLink } from 'vue-router'
import ToolCard from '@/components/tools/ToolCard.vue'
import { tools } from '@/data/tools'
const ready = inject(interactionReadyKey, ref(false))
const query = ref('')
const searchInput = ref<HTMLInputElement>()
const searchError = computed(() => query.value.length > 100 ? '搜索内容超过 100 个 UTF-16 码元，请缩短后重试。' : '')
const matches = computed(() => searchError.value ? [] : searchTools(tools, query.value))
const visibleCategories = computed(() => categories.filter(section => matches.value.some(tool => tool.category === section.category)))
function releaseQuery() { query.value = '' }
onMounted(() => window.addEventListener('pagehide', releaseQuery))
onBeforeUnmount(() => { window.removeEventListener('pagehide', releaseQuery); releaseQuery() })
function clearSearch() { query.value = ''; searchInput.value?.focus() }
const categories = [
  { id: 'office-tools', category: 'office', title: '办公工具' },
  { id: 'developer-tools', category: 'developer', title: '开发者工具' },
] as const
</script>

<template>
  <div class="discovery-panel">
  <section class="hero" aria-labelledby="home-title">
    <p class="hero-eyebrow"><span aria-hidden="true"></span>轻量工具 · 即开即用</p>
    <h1 id="home-title" tabindex="-1">让日常工作，<span>轻松一点。</span></h1>
    <p class="hero-description">PDF、图片、文本与开发工具，免费免登录，在浏览器本地处理。</p>
  </section>

  <section class="tool-search" aria-labelledby="search-heading">
    <h2 id="search-heading" class="sr-only">查找顺手的工具</h2>
    <label for="tool-search" class="sr-only">搜索工具</label>
    <div class="search-controls">
    <input id="tool-search" ref="searchInput" v-model="query" type="text" :disabled="!ready" autocomplete="off" :spellcheck="false" :aria-invalid="!!searchError" aria-describedby="search-status" placeholder="搜索工具名称或用途" />
    <button type="button" :disabled="!ready" @click="clearSearch">清除搜索</button>
    </div>
    <p id="search-status" role="status" aria-live="polite">{{ searchError || `找到 ${matches.length} 个工具` }}</p>
    <p v-if="!searchError && !matches.length">没有找到匹配工具，请调整关键词或清除搜索条件。</p>
  </section>
  </div>
  <nav v-if="visibleCategories.length" class="category-shortcuts" aria-label="工具分类快捷入口">
    <a v-for="section in visibleCategories" :key="section.id" :href="`#${section.id}`">{{ section.title }}<span>{{ matches.filter(tool => tool.category === section.category).length }}</span></a>
  </nav>
  <div class="directory-sections">
  <section v-for="section in visibleCategories" :id="section.id" :key="section.id" class="tool-section" :class="section.category" :aria-labelledby="`${section.id}-title`">
    <div class="section-heading">
      <h2 :id="`${section.id}-title`">{{ section.title }}</h2>
      <span class="tool-count">{{ matches.filter(tool => tool.category === section.category).length }} 个</span>
    </div>
    <ul class="tool-grid">
      <li v-for="tool in matches.filter(tool => tool.category === section.category)" :key="tool.id">
        <ToolCard :tool="tool" />
      </li>
    </ul>
  </section>

  </div>

  <section id="privacy" class="privacy-section" aria-labelledby="privacy-title">
    <h2 id="privacy-title">在本地处理，放心完成。</h2>
    <p>工具输入在浏览器本地处理，不上传、不自动保存，离开页面或刷新后清空。正式站点使用 Google Analytics 统计页面访问，不主动发送工具内容；文档与 2FA 页面隔离统计脚本，广告仍关闭。</p>
    <p><RouterLink :to="{ name: 'privacy' }">查看完整隐私说明</RouterLink></p>
  </section>
</template>

<style scoped>
.discovery-panel { margin-block: 28px; padding: 12px 24px 4px; border: 1px solid var(--color-border); border-radius: 24px; background-color: var(--hero-surface); background-image: radial-gradient(ellipse at 0% 0%, var(--hero-glow), transparent 65%), radial-gradient(ellipse at 100% 100%, var(--hero-glow-alt), transparent 65%), linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px); background-size: auto, auto, 28px 28px, 28px 28px; box-shadow: var(--card-shadow); }
.hero { padding-block: 28px 20px; text-align: center; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: .8125rem; font-weight: 600; letter-spacing: .08em; color: var(--color-accent); }
.hero-eyebrow > span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 4px var(--color-accent-soft); }
h1 > span { color: var(--color-accent); }
@media (max-width: 639px) { .discovery-panel { margin-block: 20px 24px; padding: 4px 16px; border-radius: 20px; } .hero { padding-top: 24px; } }
h1 { margin-bottom: 12px; font-size: clamp(1.75rem, 3.4vw, 3rem); line-height: 1.35; letter-spacing: -.035em; }
.hero-description { color: var(--color-muted); }
.tool-search { max-width: 720px; margin: 0 auto 24px; }
.search-controls { display: flex; align-items: stretch; gap: 8px; }
.tool-search input, .tool-search button { min-height: 48px; min-width: 0; padding: 10px 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); color: var(--color-text); font: inherit; }
.tool-search input { flex: 1; width: 100%; }
.tool-search button { flex-shrink: 0; cursor: pointer; }
.tool-search input:hover { border-color: var(--color-accent); }
.tool-search button { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); }
.tool-search button:hover { border-color: var(--color-accent); color: var(--color-on-accent); }
.tool-search input:focus-visible, .tool-search button:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
.tool-search p { margin-top: 8px; font-size: .875rem; color: var(--color-muted); overflow-wrap: anywhere; }
.category-shortcuts { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
.category-shortcuts a { display: inline-flex; align-items: center; gap: 12px; min-height: 44px; padding: 8px 16px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); background: var(--color-surface); text-decoration: none; font-weight: 650; }
.category-shortcuts a:hover { border-color: var(--color-accent); background: var(--color-accent-soft); }
.category-shortcuts span { color: var(--color-muted); font-size: .8125rem; font-weight: 500; }
.directory-sections { display: grid; gap: 36px; }
.tool-section { min-width: 0; }
.section-heading { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
h2 { font-size: 1.375rem; line-height: 1.4; }
.tool-count { color: var(--color-muted); font-size: .875rem; }
.tool-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 0; list-style: none; }
.tool-grid li { min-width: 0; }
.privacy-section { margin-block: 32px 40px; padding-top: 24px; border-top: 1px solid var(--color-border); }
.privacy-section h2 { font-size: 1rem; margin-bottom: 8px; }
.privacy-section p { max-width: 52rem; margin-top: 8px; color: var(--color-muted); font-size: .875rem; }
@media (min-width: 640px) { .tool-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .tool-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .hero { padding-top: 36px; } }
@media (min-width: 1280px) { .tool-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 374px) { .search-controls { flex-wrap: wrap; } .tool-search input { flex-basis: 100%; } }
</style>
