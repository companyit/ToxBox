import { PDFDocument, PDFName, degrees, rgb } from 'pdf-lib'
export async function createOrganizerFixture(count = 6) {
  const doc = await PDFDocument.create()
  const glyph = doc.context.register(doc.context.stream('600 0 d0 60 w 80 850 m 520 850 l S 300 850 m 300 100 l S 50 100 m 550 100 l S'))
  const unicode = doc.context.register(doc.context.stream('/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /TestCJK def /CMapType 2 def 1 begincodespacerange <00> <FF> endcodespacerange 1 beginbfchar <41> <5DE5> endbfchar endcmap CMapName currentdict /CMap defineresource pop end end'))
  const font = doc.context.register(doc.context.obj({ Type: 'Font', Subtype: 'Type3', FontBBox: [0, 0, 600, 1000], FontMatrix: [.001, 0, 0, .001, 0, 0], CharProcs: { uni5DE5: glyph }, Encoding: { Type: 'Encoding', Differences: [65, PDFName.of('uni5DE5')] }, FirstChar: 65, LastChar: 65, Widths: [600], Resources: {}, ToUnicode: unicode }))
  for (let i = 0; i < count; i++) {
    const page = doc.addPage([240 + i * 10, 360])
    page.drawRectangle({ x: 15, y: 15, width: 65, height: 100, color: rgb(1, 0, 0) })
    page.drawText(`Page ${i + 1}`, { x: 25, y: 250, size: 18 })
    page.setRotation(degrees([0, 0, 90, 180, 270, 0][i % 6]!))
    if (i === 4) page.setCropBox(10, 10, 200, 320)
    if (i === 0) {
      const resources = page.node.Resources()!
      const fonts = resources.lookup(PDFName.of('Font')) as ReturnType<typeof doc.context.obj> & { set: (name: PDFName, value: unknown) => void }
      fonts.set(PDFName.of('EmbeddedCJK'), font)
      page.node.addContentStream(doc.context.register(doc.context.stream('BT /EmbeddedCJK 60 Tf 100 140 Td (A) Tj ET')))
    }
  }
  return Uint8Array.from(await doc.save())
}
