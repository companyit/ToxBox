<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { site } from '@/data/site'
</script>
<template>
  <article class="page-content prose">
    <header class="page-heading"><h1 tabindex="-1">联系我们</h1><p>工具遇到问题，或有改进建议，欢迎通过邮件联系 {{ site.displayName }}。</p></header>
    <h2>联系邮箱</h2><p><a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a></p>
    <p>可用于工具问题、功能建议、隐私咨询和内容纠错。点击邮箱会打开你的邮件应用；本站不通过表单收集或自动发送信息。是否发送邮件、附上哪些内容，由你决定。</p>
    <h2>怎样描述问题更有帮助</h2>
    <ul><li>写明工具名称、浏览器及设备类型。</li><li>描述操作步骤、预期结果及实际现象。</li><li>如需示例，请重新构造不包含真实个人信息的最小样例；截图前遮挡敏感内容。</li></ul>
    <h2>请保护你的信息</h2><p>请勿发送 2FA 密钥、动态验证码、密码、令牌、私人文档或其他敏感内容。排查问题不需要你的真实密钥。发送邮件后，邮件正文、发件地址和附件将通过你选择的邮件服务及收件邮箱服务处理，不属于工具页面的本地计算。</p>
    <p>我们会按实际维护情况查看反馈，暂不承诺固定回复时间或提供紧急支持。</p>
    <p><RouterLink :to="{ name: 'privacy' }">阅读隐私政策</RouterLink> · <RouterLink :to="{ name: 'terms' }">阅读服务条款</RouterLink></p>
  </article>
</template>
