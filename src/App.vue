<script setup lang="ts">
import SiteHeader from '@/components/layout/SiteHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import HomeView from '@/views/HomeView.vue'
</script>

<template>
  <SiteHeader />
  <main id="main-content" class="container" tabindex="-1">
    <HomeView />
  </main>
  <SiteFooter />
</template>
