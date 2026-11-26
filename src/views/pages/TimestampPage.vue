<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import LocalToolEditor from '@/components/tools/LocalToolEditor.vue'
import { convertTimestamp, type TimestampOptions } from '@/utils/timestamp'

const direction = ref<TimestampOptions['direction']>('to-date')
const unit = ref<TimestampOptions['unit']>('seconds')
const offset = ref<0 | 8>(0)
const seconds = ref('')
const milliseconds = ref('')
const revision = computed(() => JSON.stringify([unit.value, offset.value, seconds.value, milliseconds.value]))
const resultContext = computed(() => direction.value === 'to-date'
  ? (offset.value === 8 ? 'UTC+08:00' : 'UTC')
  : (unit.value === 'seconds' ? 'Unix 时间戳 · 秒' : 'Unix 时间戳 · 毫秒'))

function resetPrecision() {
  seconds.value = ''
  milliseconds.value = ''
}

function transform(input: string) {
  const options = { direction: direction.value, unit: unit.value, offset: offset.value }
  if (direction.value !== 'to-timestamp' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input) || (!seconds.value && !milliseconds.value)) return convertTimestamp(input, options)
  if (!/^\d{0,2}$/.test(seconds.value) || Number(seconds.value) > 59) {
    throw new Error('秒请输入 0～59 的整数。')
  }
  if (!/^\d{0,3}$/.test(milliseconds.value)) throw new Error('毫秒请输入 0～999 的整数。')
  return convertTimestamp(`${input}:${seconds.value.padStart(2, '0')}.${milliseconds.value.padStart(3, '0')}`, options)
}
function pickerValue(input: string) {
  try {
    if (!convertTimestamp(input, { direction: 'to-timestamp', unit: 'milliseconds', offset: 0 })) return ''
  } catch {
    return ''
  }
  const minute = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?::\d{2}(?:\.\d{3})?)?$/.exec(input)?.[1]
  return minute?.replace(' ', 'T') ?? ''
}

function selectDate(event: Event, setInput: (value: string) => void) {
  resetPrecision()
  setInput((event.target as HTMLInputElement).value.replace('T', ' '))
}
</script>

<template>
  <ToolPageLayout page-name="timestamp">
    <LocalToolEditor
      workspace
      :rows="4"
      :input-context="direction"
      :label="direction === 'to-date' ? '输入时间戳或日期' : '输入日期和时间'"
      rules="时区采用 UTC 或固定 UTC+08:00。毫秒转秒会向负无穷取整。"
      :input-hint="direction === 'to-date' ? '请输入整数。可输入负数。' : '格式：YYYY-MM-DD HH:mm，可附加 :ss 或 :ss.SSS。'"
      :result-context="resultContext"
      :example="direction === 'to-date' ? '0' : '1970-01-01 00:01'"
      :limit="64"
      :revision-key="revision"
      :transform="transform"
      @reset="resetPrecision"
    >
      <div class="timestamp-field">
        <label for="time-direction">转换方向</label>
        <select id="time-direction" v-model="direction">
          <option value="to-date">时间戳转日期</option>
          <option value="to-timestamp">日期转时间戳</option>
        </select>
      </div>
      <div class="timestamp-field">
        <label for="time-unit">时间戳单位</label>
        <select id="time-unit" v-model="unit">
          <option value="seconds">秒</option>
          <option value="milliseconds">毫秒</option>
        </select>
      </div>
      <div class="timestamp-field">
        <label for="time-offset">时区</label>
        <select id="time-offset" v-model="offset">
          <option :value="0">UTC</option>
          <option :value="8">UTC+08:00（固定偏移）</option>
        </select>
      </div>
      <template v-if="direction === 'to-timestamp'" #after-input="{ input, setInput }">
        <div class="timestamp-field">
          <label for="time-picker">选择日期和时间</label>
          <input id="time-picker" class="time-picker" type="datetime-local" min="0001-01-01T00:00"
            max="9999-12-31T23:59" :value="pickerValue(input)" aria-describedby="time-picker-hint" @change="selectDate($event, setInput)" />
          <p id="time-picker-hint" class="picker-hint">选定后自动填入日期和时间文本框。</p>
        </div>
        <details v-if="input.length <= 16">
          <summary>填写秒和毫秒（可选）</summary>
          <div class="precision-fields">
            <label>秒 <input v-model="seconds" type="text" inputmode="numeric" autocomplete="off" placeholder="00" /></label>
            <label>毫秒 <input v-model="milliseconds" type="text" inputmode="numeric" autocomplete="off" placeholder="000" /></label>
          </div>
        </details>
      </template>
    </LocalToolEditor>
  </ToolPageLayout>
</template>

<style scoped>
.timestamp-field { display: grid; min-width: 0; align-content: start; gap: 10px; }
.timestamp-field label { font-weight: 650; }
.timestamp-field select { width: 100%; }
.picker-hint { margin: 0; font-size: .875rem; color: var(--color-muted); }
details { grid-column: 1 / -1; }
summary { cursor: pointer; padding-block: 8px; color: var(--color-muted); }
.precision-fields { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.precision-fields label { display: grid; gap: 4px; }
.precision-fields input, .time-picker {
  box-sizing: border-box;
  width: 8rem;
  min-height: 44px;
  padding: 8px;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-control-border);
  border-radius: var(--ui-control-radius);
  font: inherit;
}
.time-picker { width: 100%; min-width: 0; height: 48px; }
summary:focus-visible, input:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
</style>
