<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ToolPageLayout from '@/components/layout/ToolPageLayout.vue'
import { parseUrlQuery, type QueryInput } from '@/utils/urlQuery'

const input = ref<QueryInput>('url')
const source = ref('')
const formMode = ref(false)
const composing = ref(false)
const result = ref<ReturnType<typeof parseUrlQuery>>()
const page = ref(1)
const pageSize = 50
const parameters = computed(() => result.value && 'parameters' in result.value ? result.value.parameters : [])
const error = computed(() => result.value && 'error' in result.value ? result.value.error : '')
const pageCount = computed(() => Math.ceil(parameters.value.length / pageSize))
const start = computed(() => (page.value - 1) * pageSize)
const rows = computed(() => parameters.value.slice(start.value, start.value + pageSize))

function resetResult() {
  result.value = undefined
  page.value = 1
}

watch([source, input, formMode], resetResult)

function parse() {
  if (composing.value) return
  page.value = 1
  result.value = parseUrlQuery(source.value, input.value, formMode.value)
}

function clear() {
  source.value = ''
  composing.value = false
  resetResult()
}

onMounted(() => window.addEventListener('pagehide', clear))
onUnmounted(() => window.removeEventListener('pagehide', clear))
</script>

<template>
  <ToolPageLayout page-name="url-query">
    <section class="query-tool" aria-label="URL 参数解析操作">
      <div class="query-options">
        <div class="query-field">
          <label for="query-mode">输入类型</label>
          <select id="query-mode" v-model="input">
            <option value="url">完整 URL</option>
            <option value="query">查询字符串</option>
          </select>
        </div>
        <label class="form-mode"><input v-model="formMode" type="checkbox" /> 表单模式（将 + 解释为空格）</label>
      </div>
      <label for="query-source">待解析内容</label>
      <textarea
        id="query-source"
        v-model="source"
        rows="6"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        :aria-invalid="Boolean(error)"
        aria-describedby="query-help query-status"
        @compositionstart="composing = true; resetResult()"
        @compositionend="composing = false"
      />
      <p id="query-help">
        {{ input === 'url' ? '仅提取完整 URL 的查询部分。' : '可带一个前导问号，如 ?name=value。' }}
        最多 20,000 个码元和 500 条参数。
      </p>
      <div class="actions">
        <button type="button" class="primary" :disabled="composing" @click="parse">解析参数</button>
        <button type="button" @click="clear">清空</button>
      </div>
      <p id="query-status" role="status">
        <template v-if="error">{{ error }}</template>
        <template v-else-if="parameters.length">共 {{ parameters.length }} 条参数，第 {{ page }} / {{ pageCount }} 页。</template>
        <template v-else-if="result">没有查询参数。</template>
      </p>
      <section v-if="rows.length" class="query-results" aria-label="解析结果">
        <nav v-if="pageCount > 1" class="actions" aria-label="参数结果分页">
          <button type="button" :aria-disabled="page === 1" @click="page = Math.max(1, page - 1)">上一页</button>
          <button type="button" :aria-disabled="page === pageCount" @click="page = Math.min(pageCount, page + 1)">下一页</button>
        </nav>
        <table>
          <caption>解析结果</caption>
          <thead><tr><th scope="col">序号</th><th scope="col">名称</th><th scope="col">值</th></tr></thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="start + index">
              <td>{{ start + index + 1 }}</td>
              <td><span v-if="row.name" class="literal">{{ row.name }}</span><small v-else>空名称</small></td>
              <td>
                <small v-if="row.value === null">无等号</small>
                <small v-else-if="row.value === ''">空值</small>
                <span v-else class="literal">{{ row.value }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
  </ToolPageLayout>
</template>

<style scoped>
.query-tool, .query-results { display: grid; gap: 12px; min-width: 0; }
.query-tool {
  padding: clamp(12px, 3vw, 24px);
  border: 1px solid var(--color-border);
  border-radius: var(--ui-card-radius, 20px);
  background: var(--color-surface);
}
.query-options { display: flex; flex-wrap: wrap; align-items: end; gap: 12px 24px; }
.query-field { display: grid; gap: 8px; }
.query-results { padding-top: 16px; border-top: 1px solid var(--color-border); }
label { font-weight: 650; }
p { margin: 0; color: var(--color-muted); }
#query-status { min-height: 1.5em; }
textarea, select, button {
  box-sizing: border-box;
  max-width: 100%;
  min-height: 44px;
  border: 1px solid var(--color-control-border);
  border-radius: var(--ui-control-radius);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 8px 12px;
  font: inherit;
}
textarea:focus-visible, select:focus-visible, input:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 4px; }
textarea { width: 100%; resize: vertical; font-family: ui-monospace, monospace; }
select { justify-self: start; }
.form-mode { min-height: 44px; }
.form-mode, .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.primary { background: var(--color-accent); color: var(--color-on-accent); font-weight: 650; }
button:disabled, button[aria-disabled="true"] { opacity: .6; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; }
caption { text-align: start; font-weight: 650; margin-bottom: 6px; }
th, td { padding: 8px; text-align: start; border-bottom: 1px solid var(--color-control-border); vertical-align: top; }
thead { background: var(--color-accent-soft); }
th:first-child { width: 3.75rem; }
.literal { white-space: pre-wrap; overflow-wrap: anywhere; unicode-bidi: plaintext; }
small { color: var(--color-muted); }
</style>
