import { readFile } from 'node:fs/promises'
import { test, expect, hydrated } from './helpers'

for (const width of [375, 768, 1440]) test(`TDL UTF-8真实下载、三种转换和空结果 ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/office/csv-json/'); await hydrated(page)
  const input = page.locator('#table-input'), output = page.locator('#table-result')
  const run = page.getByRole('button', { name: '转换表格', exact: true })
  const button = () => page.getByRole('button', { name: /下载 (JSON|CSV)/ })
  const save = async (name: string, keyboard = false) => {
    const expected = await output.inputValue()
    const pending = page.waitForEvent('download')
    if (keyboard) { await button().focus(); await page.keyboard.press('Enter') } else await button().click()
    const download = await pending
    expect(download.suggestedFilename()).toBe(name)
    expect(await download.failure()).toBeNull()
    const filename = await download.path(); expect(filename).toBeTruthy()
    const bytes = await readFile(filename!)
    expect(bytes.equals(Buffer.from(expected, 'utf8'))).toBe(true)
    await expect(page.locator('#table-status')).toContainText('已请求浏览器下载')
    return bytes
  }
  await expect(button()).toBeDisabled()
  await input.fill('001,"中文😀"\n9007199254740993,"他说""好""\n次行"'); await run.click()
  await save('converted.json', true)
  await save('converted.json')
  await page.locator('#table-csv-output').selectOption('objects'); await expect(button()).toBeDisabled()
  await input.fill('id,name\n001,中文😀'); await run.click()
  expect(JSON.parse((await save('converted.json')).toString('utf8'))).toEqual([{ id: '001', name: '中文😀' }])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await info.attach(`table-download-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  await input.fill('id,name'); await run.click(); expect((await save('converted.json')).toString('utf8')).toBe('[]')
  await page.locator('#table-direction').selectOption('json-to-csv'); await expect(button()).toBeDisabled()
  await input.fill('[{"id":9007199254740993,"note":"中文😀\\n=x"}]'); await run.click()
  expect((await save('converted.csv')).toString('utf8')).toContain('9007199254740993')
  await input.fill('[]'); await run.click(); expect((await save('converted.csv')).length).toBe(0)
  await input.fill('INVALID'); await run.click(); await expect(button()).toBeDisabled()
  await page.getByRole('button', { name: '清空', exact: true }).click(); await expect(button()).toBeDisabled()
})

test('TDL 百万码元结果完整下载及IME禁用、离页清理', async ({ page }) => {
  await page.goto('/office/csv-json/'); await hydrated(page)
  await page.locator('#table-csv-output').selectOption('objects')
  const rows = Array<string>(1000).fill('x'); rows[0] = '""'; rows[1] = '""'
  await page.locator('#table-input').fill('k'.repeat(979) + '\n' + rows.join('\n'))
  await page.getByRole('button', { name: '转换表格', exact: true }).click()
  const expected = await page.locator('#table-result').inputValue(); expect(expected.length).toBe(1000000)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 JSON', exact: true }).click()
  const download = await pending
  expect((await readFile((await download.path())!)).equals(Buffer.from(expected, 'utf8'))).toBe(true)
  await page.locator('#table-input').dispatchEvent('compositionstart')
  await expect(page.getByRole('button', { name: '下载 JSON', exact: true })).toBeDisabled()
  await page.locator('#table-input').dispatchEvent('compositionend')
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await expect(page.locator('#table-input')).toHaveValue('')
  await expect(page.getByRole('button', { name: '下载 JSON', exact: true })).toBeDisabled()
})
