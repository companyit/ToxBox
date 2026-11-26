<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { generateCron, parseCronStart, previewCron, type CronSchedule } from '@/utils/cronPreview'

const expression = ref('')
const start = ref('')
const results = ref<string[]>()
const error = ref('')
const notice = ref('')
const schedule = ref<CronSchedule>('weekdays')
const scheduleTime = ref('09:00')
const scheduleDays = ref([1])
const interval = ref('15')
const weekdays = [
  { value: 1, label: '周一' }, { value: 2, label: '周二' }, { value: 3, label: '周三' },
  { value: 4, label: '周四' }, { value: 5, label: '周五' }, { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]
const expressionInput = ref<HTMLInputElement>()
const pickerValue = computed(() => {
  try {
    parseCronStart(start.value)
    return start.value.replace(' ', 'T')
  } catch {
    return ''
  }
})

function resetResult() {
  results.value = undefined
  error.value = ''
  notice.value = ''
}

watch([expression, start, schedule, scheduleTime, scheduleDays, interval], resetResult, { flush: 'sync' })

function preview() {
  resetResult()
  try {
    results.value = previewCron(expression.value, start.value)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : '无法计算触发时间。'
  }
}

function generate() {
  resetResult()
  try {
    expression.value = generateCron(schedule.value, scheduleTime.value, scheduleDays.value, interval.value)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : '无法生成 Cron 表达式。'
    return
  }
  if (start.value) preview()
  else notice.value = '表达式已生成。填写 UTC 起算时间后即可预览。'
}

function selectStart(event: Event) {
  start.value = (event.target as HTMLInputElement).value.replace('T', ' ')
}

function fillExample() {
  expression.value = '0 9 * * 1-5'
  start.value = '2026-11-20 09:00'
  expressionInput.value?.focus()
}

function release() {
  expression.value = ''
  start.value = ''
  schedule.value = 'weekdays'
  scheduleTime.value = '09:00'
  scheduleDays.value = [1]
  interval.value = '15'
  resetResult()
}

function clear() {
  release()
  expressionInput.value?.focus()
}

onMounted(() => window.addEventListener('pagehide', release))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', release)
  release()
})
</script>

<template>
  <ToolPageLayout page-name="cron-preview">
    <form class="cron-tool" aria-label="Cron 执行时间预览操作" @submit.prevent="preview">
      <details class="cron-generator">
        <summary>可视化生成 Cron 表达式</summary>
        <div class="generator-controls">
          <div class="cron-field">
            <label for="cron-schedule">执行计划</label>
            <select id="cron-schedule" v-model="schedule">
              <option value="daily">每天</option>
              <option value="weekdays">工作日（周一至周五）</option>
              <option value="weekly">每周指定日期</option>
              <option value="minute-step">分钟步长</option>
            </select>
          </div>
          <div v-if="schedule === 'minute-step'" class="cron-field">
            <label for="cron-interval">分钟步长</label>
            <input id="cron-interval" v-model="interval" type="text" inputmode="numeric"
              autocomplete="off" aria-describedby="cron-interval-help" />
            <p id="cron-interval-help">输入 1～59。每小时从第 0 分钟重新计算。</p>
          </div>
          <div v-else class="cron-field">
            <label for="cron-schedule-time">执行时间（UTC）</label>
            <input id="cron-schedule-time" v-model="scheduleTime" type="time" />
          </div>
        </div>
        <fieldset v-if="schedule === 'weekly'" class="cron-days">
          <legend>执行星期</legend>
          <label v-for="day in weekdays" :key="day.value">
            <input v-model="scheduleDays" type="checkbox" :value="day.value" /> {{ day.label }}
          </label>
        </fieldset>
        <button type="button" class="generate-button" @click="generate">生成表达式</button>
      </details>
      <div class="cron-field">
        <label for="cron-expression">Cron 表达式</label>
        <input id="cron-expression" ref="expressionInput" v-model="expression" type="text"
          placeholder="0 9 * * 1-5" autocomplete="off" autocapitalize="off" :spellcheck="false"
          aria-describedby="cron-fields cron-status" />
        <p id="cron-fields">分钟、小时、日期、月份、星期。日期和星期都受限时，任一匹配即可。</p>
      </div>
      <div class="cron-start">
        <div class="cron-field">
          <label for="cron-start">起算时间（UTC）</label>
          <input id="cron-start" v-model="start" type="text" placeholder="YYYY-MM-DD HH:mm"
            autocomplete="off" aria-describedby="cron-time-help cron-status" />
          <p id="cron-time-help">手输格式为 YYYY-MM-DD HH:mm，结果严格晚于起算分钟。</p>
        </div>
        <div class="cron-field">
          <label for="cron-picker">选择起算时间</label>
          <input id="cron-picker" type="datetime-local" min="0001-01-01T00:00" max="9999-12-31T23:59"
            :value="pickerValue" @change="selectStart" />
        </div>
      </div>
      <div class="cron-actions">
        <button type="submit" class="primary">预览触发时间</button>
        <button type="button" @click="fillExample">填入示例</button>
        <button type="button" @click="clear">清空</button>
      </div>
      <p id="cron-status" role="status">
        <template v-if="error">{{ error }}</template>
        <template v-else-if="notice">{{ notice }}</template>
        <template v-else-if="results?.length === 0">查找范围内没有匹配的触发时间。</template>
        <template v-else-if="results && results.length < 10">查找范围内仅找到 {{ results.length }} 次触发。</template>
        <template v-else-if="results">已找到接下来的 10 次触发时间。</template>
      </p>
      <section v-if="results?.length" class="cron-results" aria-labelledby="cron-results-heading">
        <h2 id="cron-results-heading">触发时间（UTC）</h2>
        <ol>
          <li v-for="time in results" :key="time">
            <time :datetime="time.replace(' ', 'T') + ':00Z'">{{ time }}</time>
          </li>
        </ol>
      </section>
    </form>
  </ToolPageLayout>
</template>

<style scoped>
.cron-tool, .cron-field, .cron-start, .cron-results { display: grid; min-width: 0; gap: 12px; }
.cron-start { grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.cron-field { align-content: start; }
.cron-generator { padding: 12px; border: 1px solid var(--color-border); border-radius: var(--ui-control-radius); }
.cron-generator summary { cursor: pointer; font-weight: 650; }
.generator-controls { display: grid; gap: 12px; margin-top: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); }
.cron-days { display: flex; flex-wrap: wrap; gap: 8px 14px; min-width: 0; margin: 12px 0 0; border: 1px solid var(--color-border); }
.cron-days label { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; }
.cron-days input { min-height: 0; padding: 0; accent-color: var(--color-accent); }
.generate-button { margin-top: 12px; }
label { font-weight: 650; }
input, select, button {
  box-sizing: border-box;
  min-height: 44px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--ui-control-radius);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 8px 12px;
  font: inherit;
}
input:not([type="checkbox"]), select { width: 100%; min-width: 0; }
input:focus-visible, select:focus-visible, summary:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 3px; }
p { margin: 0; color: var(--color-muted); }
.cron-field p, #cron-status { font-size: .875rem; }
#cron-status { min-height: 1.5em; }
.cron-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.primary { background: var(--color-accent); color: var(--color-on-accent); font-weight: 650; }
.cron-results { padding: 16px; border-radius: var(--ui-control-radius); background: var(--color-accent-soft); }
.cron-results h2 { font-size: 1.25rem; }
.cron-results ol { margin: 0; padding-inline-start: 1.75rem; }
.cron-results li { padding: 6px 4px; font-variant-numeric: tabular-nums; }
</style>
