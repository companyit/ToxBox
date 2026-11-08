import {test,expect,hydrated} from './helpers'
import {parse} from 'yaml'
for(const width of [375,768,1440])test(`JY 真实Worker双向转换、错误保留输入与界面 ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/developer/json-yaml/');await hydrated(page)
 const input=page.getByLabel('待转换的 JSON 或 YAML',{exact:true}),output=page.getByLabel('转换结果（只读）',{exact:true}),direction=page.getByLabel('转换方向',{exact:true}),run=page.getByRole('button',{name:'转换格式',exact:true})
 const value={name:'ToolHug',enabled:true,items:['001','中文'],note:'第一行\n第二行',nothing:null}
 await input.fill(JSON.stringify(value));await run.click();await expect(page.getByRole('status')).toContainText('转换完成')
 expect(parse(await output.inputValue())).toEqual(value)
 await page.getByRole('button',{name:'填入示例',exact:true}).click();await expect(input).toHaveValue(JSON.stringify(value));await expect(page.getByRole('status')).toContainText('请先清空')
 await direction.selectOption('yaml-to-json');await expect(output).toHaveValue('')
 const yaml='# 注释不保留\nname: ToolHug\nenabled: true\nitems: ["001", 中文]\nflag: yes\nnote: |-\n  第一行\n  第二行'
 await input.fill(yaml);await run.click();await expect(page.getByRole('status')).toContainText('转换完成')
 expect(JSON.parse(await output.inputValue())).toEqual({name:'ToolHug',enabled:true,items:['001','中文'],flag:'yes',note:'第一行\n第二行'})
 const duplicate='PRIVATE_KEY: 1\nPRIVATE_KEY: 2';await input.fill(duplicate);await expect(output).toHaveValue('');await run.click()
 await expect(page.getByRole('status')).toContainText('重复键');await expect(page.getByRole('status')).toContainText('第 2 行');await expect(page.getByRole('status')).not.toContainText('PRIVATE_KEY');await expect(input).toHaveValue(duplicate)
 for(const text of ['a: &x [*x]','---\na: 1\n---\nb: 2','1: value','a: !!str 1']){
  await input.fill(text);await run.click();await expect(page.getByRole('status')).toContainText('不支持');await expect(output).toHaveValue('')
 }
 await input.fill('value: 9007199254740992');await run.click();await expect(page.getByRole('status')).toContainText('整数须在')
 await direction.selectOption('json-to-yaml');await input.fill('{"a":1,"a":2}');await run.click();await expect(page.getByRole('status')).toContainText('重复键')
 await input.fill('{"a":}');await run.click();await expect(page.getByRole('status')).toContainText('语法无效');await expect(input).toHaveValue('{"a":}')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.getByRole('button',{name:'清空',exact:true}).click();await expect(input).toBeFocused();await expect(input).toHaveValue('')
 await page.getByRole('button',{name:'填入示例',exact:true}).click();await run.click();await expect(page.getByRole('status')).toContainText('转换完成')
 await page.screenshot({path:info.outputPath(`json-yaml-${width}.png`),fullPage:true})
})
test('JY 独立文档隔离、复制失败与离页清理',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}}))
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()))
 await page.goto('/');await hydrated(page);await page.getByLabel('搜索工具',{exact:true}).fill('YAML')
 await page.getByRole('link',{name:'试用工具 ：JSON ↔ YAML 转换',exact:true}).click();await expect(page).toHaveURL('/developer/json-yaml/');await hydrated(page)
 const storage=await page.evaluate(()=>[JSON.stringify(localStorage),JSON.stringify(sessionStorage)])
 const input=page.getByLabel('待转换的 JSON 或 YAML',{exact:true}),output=page.getByLabel('转换结果（只读）',{exact:true})
 await input.fill('{"PRIVATE_VALUE":"secret"}');await page.getByRole('button',{name:'转换格式',exact:true}).click();await expect(page.getByRole('status')).toContainText('转换完成')
 await page.getByRole('button',{name:'复制结果',exact:true}).click();await expect(page.getByRole('status')).toContainText('手动复制');await expect(output).toBeFocused()
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect(input).toHaveValue('');await expect(output).toHaveValue('')
 expect(await page.evaluate(()=>[JSON.stringify(localStorage),JSON.stringify(sessionStorage)])).toEqual(storage)
 expect(requests.every(u=>!u.includes('PRIVATE_VALUE')&&!/google|adsbygoogle/i.test(u))).toBe(true)
 await page.locator('.site-header .brand').click();await expect(page).toHaveURL('/');await hydrated(page)
 await page.goto('/developer/json-yaml/');await hydrated(page);await expect(input).toHaveValue('')
})
test('JY 输入限额、取消、过期消息与超时',async({page})=>{
 await page.addInitScript(()=>{
  const pending:unknown[]=[]
  Object.assign(window,{jyPending:pending})
  class DelayedWorker { onmessage:((event:{data:unknown})=>void)|null=null;onerror=null;constructor(){pending.push(this)}postMessage(){}terminate(){} }
  Object.defineProperty(window,'Worker',{value:DelayedWorker,configurable:true})
 })
 await page.goto('/developer/json-yaml/');await hydrated(page);await page.clock.install()
 const input=page.getByLabel('待转换的 JSON 或 YAML',{exact:true}),output=page.getByLabel('转换结果（只读）',{exact:true}),run=page.getByRole('button',{name:'转换格式',exact:true})
 await input.fill('x'.repeat(100001));await run.click();await expect(page.getByRole('status')).toContainText('100,000');await expect(input).toHaveValue('x'.repeat(100001))
 await input.fill('{}');await run.click();await page.getByRole('button',{name:'取消转换',exact:true}).click();await expect(page.getByRole('status')).toContainText('已取消')
 await input.fill('{"new":true}')
 await page.evaluate(()=>{const state=window as unknown as {jyPending:{onmessage:(event:{data:unknown})=>void}[]};state.jyPending[0]!.onmessage({data:{status:'success',output:'OLD_PRIVATE'}})})
 await expect(output).toHaveValue('');await expect(input).toHaveValue('{"new":true}')
 await run.click();await page.clock.fastForward(10000);await expect(page.getByRole('status')).toContainText('超过 10 秒');await expect(input).toHaveValue('{"new":true}');await expect(output).toHaveValue('')
})
