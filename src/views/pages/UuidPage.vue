<script setup lang="ts">
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import LocalToolEditor from '@/components/tools/LocalToolEditor.vue'
import { generateUuids } from '@/utils/uuid'
function generate(input: string) {
 if (!globalThis.crypto?.getRandomValues) throw new Error('当前环境不支持安全随机数，无法生成 UUID。')
 try { return generateUuids(input, bytes => { globalThis.crypto.getRandomValues(bytes) }) }
 catch (e) {
  if (e instanceof Error && e.message === '请输入 1～100 的十进制整数数量。') throw e
  throw new Error('安全随机数生成失败，请重试。')
 }
}
</script>

<template>
  <ToolPageLayout page-name="uuid">
    <LocalToolEditor
      workspace
      label="生成数量（1～100）"
      rules="使用 Web Crypto 安全随机数。UUID 不应用作密码。"
      input-hint="输入整数，批量结果每行一个。"
      result-context="UUID v4"
      example="1"
      initial-input="1"
      quantity
      :limit="3"
      action-label="生成 UUID"
      :transform="generate"
    />
  </ToolPageLayout>
</template>
