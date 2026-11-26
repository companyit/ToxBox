<script setup lang="ts">
import { ref } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import LocalToolEditor from '@/components/tools/LocalToolEditor.vue'
import { convertBase64 } from '@/utils/base64'

const direction = ref('encode')
</script>

<template>
  <ToolPageLayout page-name="base64">
    <LocalToolEditor
      workspace
      label="输入文本或 Base64"
      rules="最多 100,000 个 UTF-16 码元。Base64 是编码，不能保护秘密。"
      :input-hint="direction === 'encode' ? '输入或粘贴要编码的文本。' : '粘贴标准 Base64，可包含空白，末尾补位须完整。'"
      :result-context="direction === 'encode' ? '标准 Base64' : 'UTF-8 文本'"
      :example="direction === 'encode' ? '你好' : '5L2g5aW9'"
      :limit="100000"
      :revision-key="direction"
      :transform="input => convertBase64(input, direction === 'decode')"
    >
      <div class="direction-field">
        <label for="base64-direction">转换方向</label>
        <select id="base64-direction" v-model="direction">
          <option value="encode">文本编码为 Base64</option>
          <option value="decode">Base64 解码为文本</option>
        </select>
      </div>
    </LocalToolEditor>
  </ToolPageLayout>
</template>

<style scoped>
.direction-field { display: grid; gap: 10px; justify-items: start; min-width: 0; }
</style>
