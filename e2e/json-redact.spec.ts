import {readFile} from 'node:fs/promises'
import {test,expect,hydrated} from './helpers'
for(const width of [375,768,1440])test(`JRD 精度保留、路径替换、复制下载与隐私 ${width}`,async({page},info)=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error('denied'))}}))
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));await page.setViewportSize({width,height:900})
 await page.goto('/');await hydrated(page);await page.getByLabel('搜索工具',{exact:true}).fill('字段脱敏');await expect(page.locator('.tool-grid li')).toHaveCount(1)
 await Promise.all([
  page.waitForURL('**/developer/json-redact/', { waitUntil: 'load' }),
  page.getByRole('link',{name:'打开工具 ：JSON 字段脱敏',exact:true}).click(),
 ])
 await hydrated(page)
 await expect(page.locator('.site-header nav a[href="/developer/"]')).toHaveAttribute('aria-current','page')
 const storage=await page.evaluate(()=>[JSON.stringify(localStorage),JSON.stringify(sessionStorage)])
 const input=page.getByLabel('源 JSON',{exact:true}),paths=page.getByLabel('目标路径（JSON 字符串数组）',{exact:true}),output=page.getByLabel('脱敏结果（只读）',{exact:true}),run=page.getByRole('button',{name:'执行字段脱敏',exact:true})
 const source='{"id":9007199254740993,"email":"PRIVATE_SECRET_055","users":[{"phone":"13800138000","ok":true}],"keep":"中文😀"}'
 await input.fill(source);await paths.fill('["/email","/users/0/phone"]');await run.focus();await page.keyboard.press('Enter')
 await expect(page.locator('#redact-status')).toContainText('已替换 2 个目标');await expect(input).toHaveValue(source)
 const text=await output.inputValue();expect(text).toContain('9007199254740993');expect(text).not.toContain('PRIVATE_SECRET_055');expect(text).not.toContain('13800138000');expect(text).toContain('中文😀');expect(text.match(/"\*\*\*"/g)).toHaveLength(2)
 await page.getByRole('button',{name:'复制脱敏结果',exact:true}).click();await expect(page.locator('#redact-status')).toContainText('手动复制');await expect(output).toBeFocused()
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'下载脱敏 JSON',exact:true}).click();const download=await pending
 expect(download.suggestedFilename()).toBe('redacted.json');expect((await readFile((await download.path())!)).equals(Buffer.from(text,'utf8'))).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>document.documentElement.style.fontSize='')
 await page.screenshot({path:info.outputPath(`json-redact-${width}.png`),fullPage:true})
 await paths.fill('["/PRIVATE_PATH"]');await expect(output).toHaveValue('');await expect(page.getByRole('button',{name:'下载脱敏 JSON',exact:true})).toBeDisabled()
 await run.click();await expect(page.locator('#redact-status')).toContainText('第 1 项');await expect(page.locator('#redact-status')).not.toContainText('PRIVATE_PATH');await expect(input).toHaveValue(source)
 await page.getByRole('button',{name:'填入示例',exact:true}).click();await expect(page.locator('#redact-status')).toContainText('请先清空')
 expect(requests.some(url=>/PRIVATE_SECRET|PRIVATE_PATH|googletagmanager|google-analytics|adsbygoogle/.test(url))).toBe(false)
 expect(await page.evaluate(()=>[JSON.stringify(localStorage),JSON.stringify(sessionStorage)])).toEqual(storage)
 await page.getByRole('button',{name:'清空',exact:true}).click();await expect(input).toBeFocused();await expect(paths).toHaveValue('[]')
 await page.reload();await hydrated(page);await expect(input).toHaveValue('');await expect(output).toHaveValue('')
})
test('JRD 根/转义/层级重叠、严格输入及资源/IME恢复',async({page})=>{
 await page.goto('/developer/json-redact/');await hydrated(page)
 const source=page.locator('#redact-source'),paths=page.locator('#redact-paths'),replacement=page.locator('#redact-replacement'),output=page.locator('#redact-result'),run=page.getByRole('button',{name:'执行字段脱敏',exact:true}),status=page.locator('#redact-status')
 await source.fill('{"a/b":{"~key":1},"keep":9007199254740993}');await paths.fill('["/a~1b/~0key"]');await replacement.fill('');await run.click()
 await expect(status).toContainText('已替换 1 个目标');expect(await output.inputValue()).toContain('"~key": ""')
 await paths.fill('["/a~1b","/a~1b/~0key"]');await run.click();await expect(status).toContainText('重叠');await expect(output).toHaveValue('')
 await source.fill('{"a":1,"a":2}');await paths.fill('[""]');await run.click();await expect(status).toContainText('重复字段名')
 await source.fill('x'.repeat(100001));await run.click();await expect(status).toContainText('100,000');expect((await source.inputValue()).length).toBe(100001)
 await source.fill('null');await replacement.fill('***');await source.dispatchEvent('compositionstart');await expect(run).toBeDisabled();await source.dispatchEvent('compositionend');await run.click();await expect(output).toHaveValue('"***"')
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));await expect(source).toHaveValue('');await expect(paths).toHaveValue('[]');await expect(output).toHaveValue('')
})
