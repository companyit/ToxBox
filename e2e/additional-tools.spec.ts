import { test, expect, hydrated } from './helpers'
for(const width of [375,768,1440]) {
 test(`新增工具与搜索 ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900})
  for(const [path,label,input,output] of [
   ['base64','输入文本或 Base64','你好','5L2g5aW9'],
   ['timestamp','输入时间戳或日期','0','1970-01-01 00:00:00.000'],
   ['uuid','生成数量（1～100）','2',''],
  ]) {
   await page.goto(`/developer/${path}/`); await hydrated(page)
   const editor=page.getByLabel(label!,{exact:true}), result=page.getByLabel('处理结果（只读）',{exact:true})
   await editor.fill(input!)
   await page.getByRole('button',{name:path==='uuid'?'生成 UUID':'转换',exact:true}).click()
   if(path==='uuid') {
    const values=(await result.inputValue()).split('\n'); expect(values).toHaveLength(2)
    for(const value of values) expect(value).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
   } else await expect(result).toHaveValue(output!)
   await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted:true})))
   await expect(editor).toHaveValue('')
   await expect(result).toHaveValue('')
   await editor.fill('invalid')
   await expect(result).toHaveValue('')
   await page.getByRole('button',{name:'清空',exact:true}).click()
   await expect(editor).toHaveValue('')
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
  await page.goto('/'); await hydrated(page)
  const search=page.getByLabel('搜索工具',{exact:true})
  await search.fill('BASE64'); await expect(page.locator('.tool-grid li')).toHaveCount(1)
  await search.fill('不存在的工具'); await expect(page.locator('.tool-grid li')).toHaveCount(0)
  await expect(page.getByText('没有找到匹配工具，请调整关键词或清除搜索条件。')).toBeVisible()
  await page.getByRole('button',{name:'清除搜索',exact:true}).click()
  await expect(search).toBeFocused(); await expect(page.locator('.tool-grid li')).toHaveCount(19)
 })
}
test('新增工具键盘与复制失败提示、离页清空',async({page,browserName})=>{
 const tabKey = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}}))
 await page.goto('/developer/base64/'); await hydrated(page)
 const input=page.getByLabel('输入文本或 Base64',{exact:true})
 await input.focus(); await page.keyboard.type('hello')
 await page.keyboard.press(tabKey); await expect(page.getByRole('button',{name:'转换',exact:true})).toBeFocused(); await page.keyboard.press('Enter')
 await expect(page.getByLabel('处理结果（只读）',{exact:true})).toHaveValue('aGVsbG8=')
 await page.getByRole('button',{name:'复制结果',exact:true}).click()
 await expect(page.locator('#local-status')).toContainText('手动复制')
 await page.getByRole('link',{name:'首页',exact:true}).first().click(); await expect(page).toHaveURL('http://127.0.0.1:4177/'); await hydrated(page)
 await page.goBack(); await expect(page).toHaveURL('http://127.0.0.1:4177/developer/base64/'); await hydrated(page)
 await expect(input).toHaveValue('')
})
