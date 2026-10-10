<script setup lang="ts">
import { inject, onMounted } from 'vue'
import { interactionReadyKey } from './interactionReady'
const ready = inject(interactionReadyKey)
onMounted(() => { if (ready) ready.value = true })
import { RouterView, useRoute, useRouter } from 'vue-router'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import { useRouteAccessibility } from '@/composables/useRouteAccessibility'
const route = useRoute()
const { announcement, navigationError, retry } = useRouteAccessibility(useRouter())
</script>
<template>
  <SiteHeader />
  <main id="main-content" class="container" tabindex="-1">
    <div v-if="navigationError" class="navigation-error" role="alert">
      <p>页面加载失败，请重试。</p><button type="button" @click="retry">重试加载</button>
    </div>
    <p v-else-if="!route.name" role="status">正在加载页面…</p>
    <RouterView v-slot="{ Component }"><component :is="Component" :key="String(route.name)" /></RouterView>
  </main>
  <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
  <SiteFooter />
</template>
