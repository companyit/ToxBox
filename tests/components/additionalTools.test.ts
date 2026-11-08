import { afterEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LocalToolEditor from '../../src/components/tools/LocalToolEditor.vue'
import HomeView from '../../src/views/HomeView.vue'
import UuidPage from '../../src/views/pages/UuidPage.vue'
import { interactionReadyKey } from '../../src/interactionReady'
import { ref } from 'vue'
afterEach(()=>vi.unstubAllGlobals())
test('编辑、方向变化和复制异步反馈失效，失败支持手动复制', async()=>{
 let finish!:()=>void
 vi.stubGlobal('isSecureContext',true)
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise<void>(resolve=>{finish=resolve})}})
 const wrapper=mount(LocalToolEditor,{props:{label:'输入',rules:'规则',example:'示例',limit:10,transform:input=>input.toUpperCase(),revisionKey:'a'}})
 await wrapper.get('#local-input').setValue('hello')
 await wrapper.get('button').trigger('click')
 expect(wrapper.get('#local-result').element).toHaveProperty('value','HELLO')
 await wrapper.findAll('button')[3]!.trigger('click')
 await wrapper.get('#local-input').setValue('changed')
 finish(); await Promise.resolve(); await nextTick()
 expect(wrapper.text()).not.toContain('结果已复制')
 expect(wrapper.get('#local-result').element).toHaveProperty('value','')
 await wrapper.get('button').trigger('click')
 await wrapper.setProps({revisionKey:'b'})
 expect(wrapper.get('#local-result').element).toHaveProperty('value','')
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error())}})
 await wrapper.get('button').trigger('click')
 await wrapper.findAll('button')[3]!.trigger('click'); await Promise.resolve(); await nextTick()
 expect(wrapper.text()).toContain('手动复制')
 window.dispatchEvent(new Event('pagehide')); await nextTick()
 expect(wrapper.get('#local-input').element).toHaveProperty('value','')
 expect(wrapper.get('#local-result').element).toHaveProperty('value','')
 wrapper.unmount()
})
test('UUID 无安全能力时不给出随机结果', async()=>{
 vi.stubGlobal('crypto',{})
 const wrapper=mount(UuidPage,{global:{provide:{[interactionReadyKey as symbol]:ref(true)},stubs:{RouterLink:{template:'<a><slot /></a>'}}}})
 await wrapper.get('button').trigger('click')
 expect(wrapper.text()).toContain('不支持安全随机数')
 expect(wrapper.get('#local-result').element).toHaveProperty('value','')
 wrapper.unmount()
})
test('搜索超限不截断，清空恢复目录及离页不保留', async()=>{
 const options={global:{provide:{[interactionReadyKey as symbol]:ref(true)},stubs:{RouterLink:{template:'<a><slot /></a>'}}}}
 const wrapper=mount(HomeView,options)
 await wrapper.get('#tool-search').setValue('a'.repeat(101))
 expect(wrapper.get('#tool-search').element).toHaveProperty('value','a'.repeat(101))
 expect(wrapper.text()).toContain('搜索内容超过')
 expect(wrapper.findAll('.tool-grid li')).toHaveLength(0)
 await wrapper.get('.tool-search button').trigger('click')
 expect(wrapper.findAll('.tool-grid li')).toHaveLength(20)
 await wrapper.get('#tool-search').setValue('Base64')
 window.dispatchEvent(new Event('pagehide')); await nextTick()
 expect(wrapper.get('#tool-search').element).toHaveProperty('value','')
 wrapper.unmount()
 const fresh=mount(HomeView,options)
 expect(fresh.get('#tool-search').element).toHaveProperty('value','')
 fresh.unmount()
})
