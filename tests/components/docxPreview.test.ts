import { expect, test } from 'vitest'
import { safeDocxPreview } from '../../src/utils/docxPreview'
import DocxContent from '../../src/components/tools/DocxContent.vue'
import { mount } from '@vue/test-utils'
test('DOCX 白名单模型拒绝主动内容，链接仅保留文字，标签属性不继承', () => {
  const result = safeDocxPreview('<p onclick="alert(1)" style="background:url(https://bad)">你好 <a href="javascript:alert(1)">链接</a><strong>重点</strong></p><script>alert(1)</script><iframe src="https://bad"></iframe><form>隐藏表单</form>',[])
  const wrapper = mount(DocxContent,{props:{nodes:result.model,images:{}}})
  expect(wrapper.text()).toBe('你好 链接重点')
  expect(wrapper.find('a,script,iframe,form,[onclick],[style]').exists()).toBe(false)
})
test('DOCX 外部图片、空结果、超深结构与文字超限被拒绝', () => {
  for(const html of ['<img src="https://bad">','<script>code</script>','<p>'+ 'a'.repeat(500001)+'</p>','<blockquote>'.repeat(102)+'text'+'</blockquote>'.repeat(102)]) expect(()=>safeDocxPreview(html,[])).toThrow()
})
