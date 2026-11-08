<script setup lang="ts">
import {diffLabels,type DiffRow} from '@/utils/textDiff'
defineProps<{rows:readonly DiffRow[]}>()
</script>
<template>
 <table><caption class="sr-only">逐行对比，原行与新行分别表示对应文本中的行号</caption><thead><tr><th scope="col">类型</th><th scope="col">原行</th><th scope="col">新行</th><th scope="col">内容</th></tr></thead><tbody><tr v-for="(row,index) in rows" :key="index" :class="`diff-${row.kind}`"><td>{{ row.kind==='add'?'+':row.kind==='remove'?'-':'=' }} {{ diffLabels[row.kind] }}</td><td>{{ row.oldLine??'—' }}</td><td>{{ row.newLine??'—' }}</td><td class="diff-text"><span v-if="row.text===''" class="empty-line">（空行）</span><template v-else>{{ row.text }}</template></td></tr></tbody></table>
</template>
<style scoped>
table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: .875rem; }
th,td { border-bottom: 1px solid var(--color-border); padding: 10px 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
th:first-child { width: 22%; } th:nth-child(2),th:nth-child(3) { width: 14%; }
.diff-text { white-space: pre-wrap; font-family: ui-monospace,monospace; } .empty-line { color: var(--color-muted); }
.diff-add { background: var(--color-accent-soft); } .diff-add td:first-child { color: var(--color-accent); font-weight: 650; }
.diff-remove { background: #fff0ef; } .diff-remove td:first-child { color: #963b33; font-weight: 650; }
@media(prefers-color-scheme:dark){.diff-remove { background: #352324; }.diff-remove td:first-child { color: #ffb4ac; }}
</style>
