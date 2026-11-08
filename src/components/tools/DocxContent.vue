<script lang="ts">
import { defineComponent, h, type PropType, type VNodeChild } from 'vue'
import type { PreviewNode } from '@/utils/docxPreview'
export default defineComponent({
  props: { nodes: { type: Array as PropType<PreviewNode[]>, required: true }, images: { type: Object as PropType<Record<string, string>>, required: true } },
  setup(props) {
    const render = (node: PreviewNode): VNodeChild => node.text !== undefined ? node.text : node.tag === 'img' ? h('img', { src: props.images[node.image!], alt: '文档内嵌图片' }) : h(node.tag!, { colspan: node.colspan, rowspan: node.rowspan }, node.children?.map(render))
    return () => h('div', { class: 'docx-content' }, props.nodes.map(render))
  },
})
</script>
<style>
.docx-content { color: #18202a; background: white; padding: 24px; overflow-wrap: anywhere; line-height: 1.65; min-width: 0; }
.docx-content img { max-width: 100%; height: auto; }
.docx-content table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.docx-content td, .docx-content th { border: 1px solid #888; padding: 6px; overflow-wrap: anywhere; }
.docx-content p { margin-block: 10px; } .docx-content ul, .docx-content ol { padding-left: 24px; }
#docx-print { display: none; }
@media print {
  @page { size: A4 portrait; margin: 20mm; }
  html:has(body > #docx-print), body:has(> #docx-print) { background: white !important; margin: 0; padding: 0; }
  body:has(> #docx-print) > :not(#docx-print) { display: none !important; }
  body > #docx-print { display: block !important; }
  #docx-print .docx-content { padding: 0; font-family: sans-serif; font-size: 11pt; }
  #docx-print img, #docx-print tr { break-inside: avoid; }
}
</style>
