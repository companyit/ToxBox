// @vitest-environment jsdom
import { expect, test } from 'vitest'
import fs from 'node:fs/promises'

test('文本整理静态正文保留字面替换符，不生成额外 app，交互输入为空且 noindex', async () => {
  const doc = new DOMParser().parseFromString(await fs.readFile('dist-ssg/office/text-cleanup/index.html', 'utf8'), 'text/html')
    expect(doc.querySelectorAll('#app')).toHaveLength(1)
    expect(doc.querySelector('.tool-guide')?.textContent).toContain('$& 和 $1 是字面文本')
    expect(doc.querySelectorAll('.tool-guide h4')).toHaveLength(2)
    expect(doc.querySelector<HTMLTextAreaElement>('#cleanup-input')?.value).toBe('')
    expect(doc.querySelector<HTMLTextAreaElement>('#cleanup-result')?.value).toBe('')
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow')
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull()
    expect(doc.querySelector('.breadcrumbs a[href="/office/"]')).not.toBeNull()
})
