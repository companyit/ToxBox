import './assets/main.css'
import { createWebHistory } from 'vue-router'
import { createSiteApp } from './app'
const hydrate = document.getElementById('app')?.dataset.renderMode === 'ssg'
const { app, router } = createSiteApp(createWebHistory(import.meta.env.BASE_URL), hydrate, true)
await router.isReady()
app.mount('#app')
