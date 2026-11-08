import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import DateCalculatorPage from '../../src/views/pages/DateCalculatorPage.vue'
import { interactionReadyKey } from '../../src/interactionReady'
const wrappers: ReturnType<typeof mount>[] = []
function setup() {
 const w=mount(DateCalculatorPage,{attachTo:document.body,global:{provide:{[interactionReadyKey as symbol]:ref(true)},stubs:{RouterLink:{template:'<a><slot /></a>'}}}});wrappers.push(w);return w
}
afterEach(()=>{wrappers.forEach(w=>w.unmount());wrappers.length=0;vi.unstubAllGlobals()})
test('两模式主动计算、参数保留、示例防覆盖、错误保留及清空焦点',async()=>{
 const w=setup(), run=()=>w.get('button').trigger('click')
 await run();expect(w.get('#date-status').text()).toBe('暂无内容。')
 await w.get('#date-start').setValue('2024-02-28');await run();expect(w.get('#date-status').text()).toContain('补齐')
 await w.get('#date-end').setValue('2024-03-01');await run();expect(w.get('#date-result').element).toHaveProperty('value','2 天')
 await w.findAll('button')[1]!.trigger('click');expect(w.get('#date-status').text()).toContain('请先清空')
 await w.get('#date-mode').setValue('offset');expect(w.get('#date-result').element).toHaveProperty('value','')
 await w.get('#date-base').setValue('2024-03-01');await w.get('#date-days').setValue('-1');await run();expect(w.get('#date-result').element).toHaveProperty('value','2024-02-29')
 await w.get('#date-mode').setValue('difference');expect(w.get('#date-start').element).toHaveProperty('value','2024-02-28')
 await w.get('#date-start').setValue('PRIVATE_LONG_INPUT');await run();expect(w.get('#date-start').element).toHaveProperty('value','PRIVATE_LONG_INPUT');expect(w.get('#date-status').text()).not.toContain('PRIVATE')
 await w.findAll('button')[2]!.trigger('click');expect(document.activeElement).toBe(w.get('#date-start').element)
 await w.get('#date-mode').setValue('offset');expect(w.get('#date-base').element).toHaveProperty('value','');expect(w.get('#date-days').element).toHaveProperty('value','')
 await w.findAll('button')[1]!.trigger('click');await run();expect(w.get('#date-result').element).toHaveProperty('value','2024-02-29')
})
test('组合输入禁用全部操作；0 天可以复制，失败选中结果',async()=>{
 vi.stubGlobal('isSecureContext',true)
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error())}})
 const w=setup();await w.get('#date-start').setValue('2024-01-01');await w.get('#date-end').setValue('2024-01-01')
 await w.get('#date-start').trigger('compositionstart');for(const b of w.findAll('button'))expect(b.attributes()).toHaveProperty('disabled');expect(w.get('#date-mode').attributes()).toHaveProperty('disabled')
 await w.get('#date-start').trigger('compositionend');await w.get('button').trigger('click');expect(w.get('#date-result').element).toHaveProperty('value','0 天')
 await w.findAll('button')[3]!.trigger('click');await flushPromises();expect(w.get('#date-status').text()).toContain('手动复制');expect(document.activeElement).toBe(w.get('#date-result').element)
})
test('复制完成才播报，编辑/模式/pagehide/卸载废弃迟到反馈',async()=>{
 vi.stubGlobal('isSecureContext',true)
 let finish!:()=>void
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise<void>(resolve=>{finish=resolve})}})
 const w=setup()
 for(const action of ['success','edit','mode','hide','unmount']) {
  if(w.get('#date-mode').element instanceof HTMLSelectElement) await w.get('#date-mode').setValue('difference')
  await w.get('#date-start').setValue('2024-01-01');await w.get('#date-end').setValue('2024-01-01');await w.get('button').trigger('click');await w.findAll('button')[3]!.trigger('click')
  expect(w.get('#date-status').text()).not.toContain('已复制')
  if(action==='edit')await w.get('#date-end').setValue('2024-01-02')
  if(action==='mode')await w.get('#date-mode').setValue('offset')
  if(action==='hide')window.dispatchEvent(new Event('pagehide'))
  if(action==='unmount'){w.unmount();wrappers.splice(wrappers.indexOf(w),1)}
  finish();await flushPromises()
  if(action==='success')expect(w.get('#date-status').text()).toContain('已复制')
  else if(action!=='unmount')expect(w.get('#date-status').text()).toBe('')
 }
 const fresh=setup();expect(fresh.get('#date-start').element).toHaveProperty('value','')
})
