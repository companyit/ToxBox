import fs from 'node:fs'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
export type AdvancedPdfKind = 'jpx' | 'cmyk' | 'cmap' | 'oversize' | 'broken-jpx' | 'blank'
export async function createAdvancedOrganizerFixture(kind: AdvancedPdfKind) {
  const doc = await PDFDocument.create(), page = doc.addPage([240, 320])
  if (kind === 'blank') return Uint8Array.from(await doc.save())
  if (kind === 'cmap') {
    const descriptor = doc.context.register(doc.context.obj({ Type: 'FontDescriptor', FontName: 'STSong-Light', Flags: 4, FontBBox: [0, -200, 1000, 900], ItalicAngle: 0, Ascent: 880, Descent: -120, CapHeight: 880, StemV: 80 }))
    const descendant = doc.context.register(doc.context.obj({ Type: 'Font', Subtype: 'CIDFontType0', BaseFont: 'STSong-Light', CIDSystemInfo: { Registry: PDFString.of('Adobe'), Ordering: PDFString.of('GB1'), Supplement: 5 }, FontDescriptor: descriptor, DW: 1000 }))
    // CIDSystemInfo strings must be PDF strings, not PDF names.
    const font = doc.context.register(doc.context.obj({ Type: 'Font', Subtype: 'Type0', BaseFont: 'STSong-Light', Encoding: 'UniGB-UCS2-H', DescendantFonts: [descendant] }))
    page.node.set(PDFName.of('Resources'), doc.context.obj({ Font: { TestCJK: font } }))
    page.node.addContentStream(doc.context.register(doc.context.stream('BT /TestCJK 40 Tf 30 150 Td <4E2D6587> Tj ET')))
  } else {
    const jpx = kind === 'jpx' || kind === 'broken-jpx'
    const bytes = jpx ? fs.readFileSync(new URL('./fixtures/organizer-red-blue.jp2', import.meta.url)) : Uint8Array.from([0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0])
    if (kind === 'broken-jpx') bytes.fill(0, 200)
    const size = jpx ? 32 : kind === 'oversize' ? 4001 : 2
    const image = doc.context.register(doc.context.stream(bytes, { Type: 'XObject', Subtype: 'Image', Width: size, Height: size, BitsPerComponent: 8, ColorSpace: jpx ? 'DeviceRGB' : 'DeviceCMYK', Interpolate: false, ...(jpx ? { Filter: 'JPXDecode' } : {}) }))
    page.node.set(PDFName.of('Resources'), doc.context.obj({ XObject: { TestImage: image } }))
    page.node.addContentStream(doc.context.register(doc.context.stream('q 200 0 0 200 20 60 cm /TestImage Do Q')))
  }
  return Uint8Array.from(await doc.save())
}
