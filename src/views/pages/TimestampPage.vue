<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import LocalToolEditor from '@/components/tools/LocalToolEditor.vue'
import { convertTimestamp } from '@/utils/timestamp'
import type { TimestampOptions } from '@/utils/timestamp'
const direction = ref<TimestampOptions['direction']>('to-date'), unit = ref<TimestampOptions['unit']>('seconds'), offset = ref<0|8>(0)
const revision = computed(() => `${direction.value}/${unit.value}/${offset.value}`)
</script>
<template><ToolPageLayout page-name="timestamp"><LocalToolEditor label="输入时间戳或日期" rules="明确选择秒或毫秒，支持负整数，不自动猜测。日期格式 YYYY-MM-DD HH:mm:ss.SSS，年份 0001～9999。时区为 UTC 或固定 UTC+08:00，不使用设备时区或夏令时。毫秒转秒向负无穷取整，会丢失毫秒精度。最多 64 个 UTF-16 码元。" :example="direction === 'to-date' ? '0' : '1970-01-01 00:00:00.000'" :limit="64" :revision-key="revision" :transform="input => convertTimestamp(input, {direction, unit, offset})"><label for="time-direction">转换方向</label><select id="time-direction" v-model="direction"><option value="to-date">时间戳转日期</option><option value="to-timestamp">日期转时间戳</option></select><label for="time-unit">时间戳单位</label><select id="time-unit" v-model="unit"><option value="seconds">秒</option><option value="milliseconds">毫秒</option></select><label for="time-offset">时区</label><select id="time-offset" v-model="offset"><option :value="0">UTC</option><option :value="8">UTC+08:00（固定偏移）</option></select></LocalToolEditor></ToolPageLayout></template>
