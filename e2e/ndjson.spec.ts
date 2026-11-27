import { expect, hydrated, origin, test } from './helpers'

test('NDJSON 搜索、双向转换、记录数及本地处理', async ({ page }) => {
  const external: string[] = []
  await page.route('**/*', route => {
    if (route.request().url().startsWith(origin + '/')) return route.continue()
    external.push(route.request().url())
    return route.abort()
  })
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/')
  await hydrated(page)
  await page.getByLabel('搜索工具', { exact: true }).fill('NDJSON')
  await Promise.all([
    page.waitForURL('**/developer/ndjson/', { waitUntil: 'load' }),
    page.getByRole('link', { name: '打开工具 ：NDJSON 与 JSON 数组互转', exact: true }).click(),
  ])
  await hydrated(page)
  const input = page.locator('#local-input')
  const result = page.locator('#local-result')
  const status = page.locator('#local-status')
  const run = page.getByRole('button', { name: '转换', exact: true })
  await input.fill('9007199254740993\n\nfalse')
  await run.press('Enter')
  await expect(result).toHaveValue('[9007199254740993,false]')
  await expect(status).toHaveText('已转换 2 条记录。')
  await page.getByLabel('处理方式').selectOption('to-lines')
  await expect(result).toHaveValue('')
  await input.fill('[9007199254740993,null]')
  await run.click()
  await expect(result).toHaveValue('9007199254740993\nnull')
  await input.fill('[]')
  await run.click()
  await expect(status).toHaveText('已转换 0 条记录。')
  await expect(result).toHaveValue('')
  await expect(result).not.toHaveAttribute('placeholder', /转换/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  expect(external).toEqual([])
})

test('错误定位和示例、复制失败与离页清理', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } })
  })
  await page.goto('/developer/ndjson/')
  await hydrated(page)
  const input = page.locator('#local-input')
  const result = page.locator('#local-result')
  const status = page.locator('#local-status')
  const run = page.getByRole('button', { name: '转换', exact: true })
  await input.fill('true\n\nPRIVATE')
  await run.click()
  await expect(status).toHaveText('第 3 行：JSON 语法无效。')
  await expect(input).toHaveValue('true\n\nPRIVATE')
  await expect(result).toHaveValue('')
  await page.getByRole('button', { name: '填入示例' }).click()
  await run.click()
  await expect(result).toHaveValue('[{"id":9007199254740993},{"id":2}]')
  await page.getByRole('button', { name: '复制结果' }).click()
  await expect(status).toContainText('手动复制')
  await expect(result).toBeFocused()
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect(input).toHaveValue('')
  await expect(result).toHaveValue('')
})

test('导入各方向的文件并按转换结果下载 UTF-8 字节', async ({ page }) => {
  await page.goto('/developer/ndjson/')
  await hydrated(page)
  const file = page.locator('#ndjson-file')
  const input = page.locator('#local-input')
  const result = page.locator('#local-result')
  const run = page.getByRole('button', { name: '转换', exact: true })
  const download = page.getByRole('button', { name: '下载结果' })
  const checkDownload = async (name: string, expected: string) => {
    const [saved] = await Promise.all([page.waitForEvent('download'), download.click()])
    expect(saved.suggestedFilename()).toBe(name)
    const stream = await saved.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(Buffer.from(chunk))
    expect(Buffer.concat(chunks)).toEqual(Buffer.from(expected, 'utf8'))
  }

  const payload = '{"值":9007199254740993}\nnull'
  await file.setInputFiles({ name: 'records.jsonl', mimeType: 'application/octet-stream', buffer: Buffer.from(payload) })
  await expect(input).toHaveValue(payload)
  await expect(download).toBeDisabled()
  await run.click()
  const array = '[{"值":9007199254740993},null]'
  await expect(result).toHaveValue(array)
  await checkDownload('converted.json', array)

  await file.setInputFiles({ name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from('[]') })
  await expect(page.locator('.file-field [role=status]')).toContainText('请选择')
  await expect(input).toHaveValue(payload)
  await expect(result).toHaveValue(array)
  await file.setInputFiles({ name: 'invalid.ndjson', mimeType: 'application/octet-stream', buffer: Buffer.from([0xff]) })
  await expect(page.locator('.file-field [role=status]')).toContainText('不是有效的 UTF-8')
  await expect(result).toHaveValue(array)

  await page.getByLabel('处理方式').selectOption('to-lines')
  await expect(download).toBeDisabled()
  await file.setInputFiles({ name: 'records.json', mimeType: 'application/json', buffer: Buffer.from(array) })
  await expect(input).toHaveValue(array)
  await run.click()
  await checkDownload('converted.ndjson', payload)
  await input.fill('[]')
  await expect(download).toBeDisabled()
  await run.click()
  await checkDownload('converted.ndjson', '')
})

test('编辑内容使过期文件读取失效', async ({ page }) => {
  await page.addInitScript(() => {
    const reader = window.FileReader
    window.FileReader = class extends reader {
      readAsArrayBuffer() {
        setTimeout(() => {
          Object.defineProperty(this, 'result', { value: new TextEncoder().encode('false').buffer })
          this.dispatchEvent(new ProgressEvent('load'))
          document.documentElement.dataset.fileReadFinished = 'true'
        }, 300)
      }
    }
  })
  await page.goto('/developer/ndjson/')
  await hydrated(page)
  const input = page.locator('#local-input')
  await page.locator('#ndjson-file').setInputFiles({ name: 'late.ndjson', mimeType: 'application/octet-stream', buffer: Buffer.from('false') })
  await input.fill('true')
  await expect(page.locator('html')).toHaveAttribute('data-file-read-finished', 'true')
  await expect(input).toHaveValue('true')
})

test('从本地文件逐行校验多条错误，报告随输入或模式失效', async ({ page }) => {
  await page.goto('/developer/ndjson/')
  await hydrated(page)
  await page.getByLabel('处理方式').selectOption('validate')
  const source = 'true\n\nPRIVATE\n{"a":1,"a":2}\nnull'
  await page.locator('#ndjson-file').setInputFiles({ name: 'check.ndjson', mimeType: 'application/octet-stream', buffer: Buffer.from(source) })
  const input = page.locator('#local-input')
  const result = page.locator('#local-result')
  await expect(input).toHaveValue(source)
  await page.getByRole('button', { name: '逐行校验' }).press('Enter')
  await expect(page.locator('#local-status')).toContainText('通过 2 条，错误 2 条')
  await expect(page.getByRole('button', { name: '转为 JSON 数组' })).toHaveCount(0)
  await expect(result).toHaveValue('通过 2 条，错误 2 条。\n第 3 行：JSON 语法无效。\n第 4 行：含有重复字段名。')
  await expect(page.getByRole('button', { name: '复制结果' })).toBeEnabled()
  await input.fill('false')
  await expect(result).toHaveValue('')
  await page.getByRole('button', { name: '逐行校验' }).click()
  await expect(result).toHaveValue('通过 1 条，错误 0 条。')
  await page.getByRole('button', { name: '转为 JSON 数组' }).press('Enter')
  await expect(page.getByLabel('处理方式')).toHaveValue('to-array')
  await expect(input).toHaveValue('false')
  await expect(result).toHaveValue('[false]')
  await expect(result).toBeFocused()
  const [saved] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载结果' }).click(),
  ])
  expect(saved.suggestedFilename()).toBe('converted.json')
  const chunks: Buffer[] = []
  for await (const chunk of await saved.createReadStream()) chunks.push(Buffer.from(chunk))
  expect(Buffer.concat(chunks).toString('utf8')).toBe('[false]')
})

test('取消读取保留输入和原结果，并回焦文件按钮', async ({ page }) => {
  await page.addInitScript(() => {
    window.FileReader = class extends window.FileReader {
      readAsArrayBuffer() {}
    }
  })
  await page.goto('/developer/ndjson/')
  await hydrated(page)
  const input = page.locator('#local-input')
  const file = page.getByRole('button', { name: '导入本地文件' })
  await input.fill('true')
  await page.getByRole('button', { name: '转换', exact: true }).click()
  await page.locator('#ndjson-file').setInputFiles({ name: 'pending.ndjson', mimeType: 'application/octet-stream', buffer: Buffer.from('false') })
  await expect(page.locator('#ndjson-file-status')).toHaveText('正在本地读取文件…')
  await page.getByRole('button', { name: '取消读取', exact: true }).press('Enter')
  await expect(file).toBeFocused()
  await expect(page.locator('#ndjson-file-status')).toContainText('当前输入已保留')
  await expect(input).toHaveValue('true')
  await expect(page.locator('#local-result')).toHaveValue('[true]')
  await page.clock.install()
  await page.locator('#ndjson-file').setInputFiles({ name: 'timeout.ndjson', mimeType: 'application/octet-stream', buffer: Buffer.from('false') })
  await page.clock.runFor(10_000)
  await expect(page.locator('#ndjson-file-status')).toContainText('读取超过 10 秒')
  await expect(input).toHaveValue('true')
})

test('处理当前草稿时继续读取文件，直到成功或用户取消', async ({ page }) => {
  await page.addInitScript(() => {
    window.FileReader = class extends window.FileReader {
      readAsArrayBuffer() {
        document.addEventListener('complete-test-file-read', () => {
          Object.defineProperty(this, 'result', { value: new TextEncoder().encode('false').buffer })
          this.dispatchEvent(new ProgressEvent('load'))
        }, { once: true })
      }
    }
  })
  await page.goto('/developer/ndjson/')
  await hydrated(page)
  const input = page.locator('#local-input')
  const result = page.locator('#local-result')
  const file = page.locator('#ndjson-file')
  const status = page.locator('#ndjson-file-status')
  const cancel = page.getByRole('button', { name: '取消读取' })
  const payload = { name: 'pending.ndjson', mimeType: 'application/octet-stream', buffer: Buffer.from('false') }

  await input.fill('true')
  await file.setInputFiles(payload)
  await page.getByRole('button', { name: '转换', exact: true }).press('Enter')
  await expect(result).toHaveValue('[true]')
  await expect(status).toHaveText('正在本地读取文件…')
  await expect(cancel).toBeVisible()
  await page.evaluate(() => document.dispatchEvent(new Event('complete-test-file-read')))
  await expect(input).toHaveValue('false')
  await expect(result).toHaveValue('')
  await expect(status).toContainText('文件已载入')

  await page.getByLabel('处理方式').selectOption('validate')
  await input.fill('true')
  await file.setInputFiles(payload)
  await page.getByRole('button', { name: '逐行校验', exact: true }).press('Enter')
  await expect(result).toHaveValue('通过 1 条，错误 0 条。')
  await expect(status).toHaveText('正在本地读取文件…')
  await cancel.press('Enter')
  await page.evaluate(() => document.dispatchEvent(new Event('complete-test-file-read')))
  await expect(page.getByRole('button', { name: '导入本地文件' })).toBeFocused()
  await expect(input).toHaveValue('true')
  await expect(result).toHaveValue('通过 1 条，错误 0 条。')
  await expect(status).toContainText('当前输入已保留')
})

test('缩进选项应用到校验直转，下载与展示一致', async ({ page }) => {
  await page.goto('/developer/ndjson/')
  await hydrated(page)
  await page.getByLabel('处理方式').selectOption('validate')
  const input = page.locator('#local-input')
  const result = page.locator('#local-result')
  const format = page.getByLabel('数组输出排版')
  await input.fill('{"id":9007199254740993}\nfalse')
  await page.getByRole('button', { name: '逐行校验' }).click()
  await format.selectOption('pretty')
  await page.getByRole('button', { name: '转为 JSON 数组' }).click()
  const pretty = '[\n  {\n    "id": 9007199254740993\n  },\n  false\n]'
  await expect(result).toHaveValue(pretty)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载结果' }).click(),
  ])
  const chunks: Buffer[] = []
  for await (const chunk of await download.createReadStream()) chunks.push(Buffer.from(chunk))
  expect(Buffer.concat(chunks)).toEqual(Buffer.from(pretty, 'utf8'))
  await format.selectOption('compact')
  await expect(result).toHaveValue('')
  await page.getByRole('button', { name: '转换', exact: true }).click()
  await expect(result).toHaveValue('[{"id":9007199254740993},false]')
})
