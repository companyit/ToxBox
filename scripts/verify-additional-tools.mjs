import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
const stage = Number(process.argv[2] ?? 4)
const browser = await chromium.launch()
const checks = [], errors = [], requests = []
try {
 const page = await browser.newPage()
 page.on('pageerror', e => errors.push(e.message))
 page.on('request', r => requests.push(r.url()))
 for (const width of [375, 768, 1440]) {
  await page.setViewportSize({width,height:900})
  await page.goto('http://127.0.0.1:4181/developer/base64/')
  const input = page.getByLabel('输入文本或 Base64',{exact:true}), output = page.getByLabel('处理结果（只读）',{exact:true})
  await input.fill('你好')
  await page.getByRole('button',{name:'转换',exact:true}).click()
  assert.equal(await output.inputValue(), '5L2g5aW9')
  await page.getByLabel('转换方向').selectOption('decode')
  assert.equal(await output.inputValue(), '')
  await input.fill('5L2g5aW9')
  await page.getByRole('button',{name:'转换',exact:true}).click()
  assert.equal(await output.inputValue(), '你好')
  await input.fill('Zh==')
  await page.getByRole('button',{name:'转换',exact:true}).click()
  assert.equal(await output.inputValue(), '')
  assert.match(await page.locator('#local-status').textContent(), /无效/)
  await page.getByRole('button',{name:'清空',exact:true}).click()
  assert.equal(await input.inputValue(), '')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth), false)
  checks.push(`Base64 ${width}px 编解码、失效、错误、清空与布局`)
 }
 if(stage >= 2) {
  await page.goto('http://127.0.0.1:4181/developer/timestamp/')
  await page.getByLabel('输入时间戳或日期',{exact:true}).fill('0')
  await page.getByRole('button',{name:'转换',exact:true}).click()
  assert.equal(await page.getByLabel('处理结果（只读）',{exact:true}).inputValue(), '1970-01-01 00:00:00.000')
  await page.getByLabel('时区',{exact:true}).selectOption('8')
  await page.getByRole('button',{name:'转换',exact:true}).click()
  assert.equal(await page.getByLabel('处理结果（只读）',{exact:true}).inputValue(), '1970-01-01 08:00:00.000')
  checks.push('时间戳 UTC/UTC+08:00 转换')
 }
 if(stage >= 3) {
  await page.goto('http://127.0.0.1:4181/developer/uuid/')
  await page.getByLabel('生成数量（1～100）',{exact:true}).fill('3')
  await page.getByRole('button',{name:'生成 UUID',exact:true}).click()
  const values = (await page.getByLabel('处理结果（只读）',{exact:true}).inputValue()).split('\n')
  assert.equal(values.length,3)
  for(const v of values) assert.match(v,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
  checks.push('UUID 安全随机批量生成')
 }
 if(stage >= 4) {
  await page.goto('http://127.0.0.1:4181/')
  const search = page.getByLabel('搜索工具',{exact:true})
  await search.fill('BASE64')
  assert.equal(await page.locator('.tool-grid li').count(),1)
  await search.fill('无匹配的工具')
  assert.equal(await page.locator('.tool-grid li').count(),0)
  await page.getByRole('button',{name:'清除搜索',exact:true}).click()
  assert.equal(await page.locator('.tool-grid li').count(),10)
  assert.equal(await search.evaluate(el=>el===document.activeElement),true)
  checks.push('搜索大小写、无结果、清除与焦点')
 }
 assert.deepEqual(errors,[])
 assert(requests.every(url=>url.startsWith('http://127.0.0.1:4181/')))
 console.log(JSON.stringify({browser:browser.version(),stage,checks,errors,externalRequests:0},null,2))
} finally { await browser.close() }
