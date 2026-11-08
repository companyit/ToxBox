import { test, expect } from 'vitest'
import { PDFDocument, PDFName } from 'pdf-lib'
import { initialOrganizerPlan, moveOrganizerPage, validateOrganizerPlan, validateOrganizerFile } from '../../src/utils/pdfOrganizerPlan'
import { inspectOrganizerPdf, exportOrganizerPdf } from '../../src/utils/pdfOrganizer'
import { createOrganizerFixture } from '../helpers/pdfOrganizerFixture'
const file = (bytes: Uint8Array<ArrayBuffer>) => new File([bytes], 'synthetic.pdf', { type: 'application/pdf' })
test('计划移动保留原索引且不改原计划，拒绝重复/空/异常旋转/越界', () => {
  const original = initialOrganizerPlan(6), moved = moveOrganizerPage(original, 4, 0)
  expect(moved.map(p => p.sourceIndex)).toEqual([4, 0, 1, 2, 3, 5]); expect(original[0]!.sourceIndex).toBe(0)
  for (const plan of [[], [{ sourceIndex: 6, rotationDelta: 0 }], [{ sourceIndex: 0, rotationDelta: 45 }], [original[0]!, original[0]!]]) expect(() => validateOrganizerPlan(plan, 6)).toThrow()
  for (const count of [0, 101, 1.5, NaN]) expect(() => initialOrganizerPlan(count)).toThrow()
  expect(initialOrganizerPlan(100)).toHaveLength(100); expect(() => moveOrganizerPage(original, 0, -1)).toThrow()
})
test('文件限制20MiB、后缀及非空', () => {
  expect(() => validateOrganizerFile({ name: 'x.PDF', size: 20 * 1024 ** 2 })).not.toThrow()
  for (const value of [{ name: 'x.pdf', size: 0 }, { name: 'x.txt', size: 20 }, { name: 'x.pdf', size: 20 * 1024 ** 2 + 1 }]) expect(() => validateOrganizerFile(value)).toThrow()
})
test('真实导出5/1/3/4/6、原旋转叠加、尺寸/CropBox与嵌入字体保留', async () => {
  const source = file(await createOrganizerFixture()), geometry = await inspectOrganizerPdf(source)
  expect(geometry[4]).toEqual({ view: [10, 10, 210, 330], rotation: 270 })
  const plan = moveOrganizerPage(initialOrganizerPlan(6), 4, 0).filter(p => p.sourceIndex !== 1)
  plan.find(p => p.sourceIndex === 2)!.rotationDelta = 90
  const bytes = await exportOrganizerPdf(source, plan), out = await PDFDocument.load(bytes)
  expect(out.getPages().map(p => [p.getWidth(), p.getRotation().angle])).toEqual([[280, 270], [240, 0], [260, 180], [270, 180], [290, 0]])
  expect(out.getPage(0).getCropBox()).toEqual({ x: 10, y: 10, width: 200, height: 320 })
  expect(out.getPage(1).node.Resources()!.lookup(PDFName.of('Font'))!.toString()).toContain('EmbeddedCJK')
})
test('100页允许，101页/损坏/AcroForm拒绝，恶意计划在导出前拒绝', async () => {
  expect(await inspectOrganizerPdf(file(await createOrganizerFixture(100)))).toHaveLength(100)
  await expect(inspectOrganizerPdf(file(await createOrganizerFixture(101)))).rejects.toThrow()
  await expect(inspectOrganizerPdf(file(new TextEncoder().encode('%PDF-broken')))).rejects.toThrow()
  const doc = await PDFDocument.create(); doc.addPage(); doc.getForm().createTextField('test')
  await expect(inspectOrganizerPdf(file(Uint8Array.from(await doc.save())))).rejects.toThrow()
  await expect(exportOrganizerPdf(file(await createOrganizerFixture()), [{ sourceIndex: 999, rotationDelta: 0 }])).rejects.toThrow()
})
