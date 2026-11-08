<script setup lang="ts">
import { ref } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import LocalToolEditor from '@/components/tools/LocalToolEditor.vue'
import { convertBase64 } from '@/utils/base64'
const direction = ref('encode')
</script>
<template><ToolPageLayout page-name="base64"><LocalToolEditor label="输入文本或 Base64" rules="标准 Base64 与 UTF-8 文本互转，最多 100,000 个 UTF-16 码元。解码允许 ASCII 空白，要求完整 padding。Base64 是编码，不能保护秘密。" :example="direction === 'encode' ? '你好' : '5L2g5aW9'" :limit="100000" :revision-key="direction" :transform="input => convertBase64(input, direction === 'decode')"><label for="base64-direction">转换方向</label><select id="base64-direction" v-model="direction"><option value="encode">文本编码为 Base64</option><option value="decode">Base64 解码为文本</option></select></LocalToolEditor></ToolPageLayout></template>
