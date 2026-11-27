import { expect, hydrated, test } from './helpers'

const tools = [
  {
    name: '文件对比', path: '/office/file-diff/', prefix: 'file', extension: 'txt',
    picker: '选择原文件', otherPicker: '选择新文件', preview: '原文件预览（只读）',
  },
  {
    name: 'JSON 结构对比', path: '/developer/json-diff/', prefix: 'json-file', extension: 'json',
    picker: '导入原 JSON 文件', otherPicker: '导入新 JSON 文件', preview: '原 JSON',
  },
] as const

for (const tool of tools) {
  test(`${tool.name}读取完成时接续键盘焦点`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.addInitScript(() => {
      window.Worker = class extends window.Worker {
        postMessage(message: unknown) {
          document.addEventListener('resume-test-file-read', () => super.postMessage(message), { once: true })
        }
      }
    })
    await page.goto(tool.path)
    await hydrated(page)

    const input = page.locator(`#${tool.prefix}-before`)
    const status = page.locator(`#${tool.prefix}-status-before`)
    const preview = page.getByLabel(tool.preview, { exact: true })
    const cancel = page.getByRole('button', { name: '取消原文件读取', exact: true })
    const picker = page.getByRole('button', { name: tool.picker, exact: true })
    const otherPicker = page.getByRole('button', { name: tool.otherPicker, exact: true })
    const chooseFile = (buffer: Buffer) => input.setInputFiles({
      name: `original.${tool.extension}`, mimeType: 'application/octet-stream', buffer,
    })
    const resume = () => page.evaluate(() => document.dispatchEvent(new Event('resume-test-file-read')))
    const original = '{"original":true}'
    const replacement = '{"replacement":true}'

    await chooseFile(Buffer.from(original))
    await cancel.focus()
    await resume()
    await expect(preview).toHaveValue(original)
    await expect(picker).toBeFocused()

    await chooseFile(Buffer.from([0xff, 0xfe]))
    await cancel.focus()
    await resume()
    await expect(status).toContainText('UTF-8')
    await expect(preview).toHaveValue(original)
    await expect(picker).toBeFocused()

    await chooseFile(Buffer.from(replacement))
    await cancel.focus()
    await otherPicker.focus()
    await resume()
    await expect(preview).toHaveValue(replacement)
    await expect(otherPicker).toBeFocused()

    await page.clock.install()
    await chooseFile(Buffer.from(original))
    await cancel.focus()
    await page.clock.runFor(10_000)
    await expect(status).toContainText('读取超过 10 秒')
    await expect(preview).toHaveValue(replacement)
    await expect(picker).toBeFocused()
  })
}
