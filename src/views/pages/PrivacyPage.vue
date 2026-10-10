<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
<template>
  <article class="page-content prose">
    <header class="page-heading"><h1 tabindex="-1">隐私说明</h1><p>文本统计、JSON 与 URL 工具在浏览器本地处理输入，无需登录。</p></header>
    <h2>工具内容</h2><p>工具输入和结果只保存在当前页面内存中，不上传、不写入地址、日志或浏览器持久化存储。离开工具页面或刷新后清空，重新进入需重新输入。</p>
    <h2>剪贴板</h2><p>仅在点击复制时请求写入剪贴板；应用不读取剪贴板。浏览器不支持或拒绝时，选中文本并提示手动复制。</p>
    <h2>网站请求与服务</h2><p>加载网站会请求页面、脚本、样式、图标等静态资源。这不等于上传工具输入。当前不接入广告、分析平台、账户、数据库或云存储；未来若改变处理范围，将先审阅并更新说明。</p>
    <p><RouterLink :to="{ name: 'home' }">返回工具目录</RouterLink> · <RouterLink :to="{ name: 'about' }">关于 WorkDev Tools</RouterLink></p>
  </article>
</template>
