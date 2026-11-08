import { DOCX_LIMITS, imageDimensions, type DocxImage } from './docxLimits'
export interface PreviewNode { tag?: string; text?: string; image?: string; colspan?: number; rowspan?: number; children?: PreviewNode[] }
const tags = new Set(['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','b','i','u','s','sub','sup','br','table','thead','tbody','tfoot','tr','td','th','blockquote'])
const forbidden = new Set(['script','style','iframe','object','embed','svg','math','form','input','button','textarea','select','link','meta','base','template'])
export function safeDocxPreview(html: string, images: readonly DocxImage[]) {
  if (html.length > 10 * 1024 ** 2 || images.length > DOCX_LIMITS.images) throw Error('预览内容超过限额。')
  const byId = new Map<string, DocxImage>(); let bytes = 0
  for (const image of images) {
    imageDimensions(image.bytes, image.type); bytes += image.bytes.byteLength
    if (bytes > DOCX_LIMITS.imageBytes || byId.has(image.id) || !/^local-image-\d+$/.test(image.id)) throw Error('图片超过限额。')
    byId.set(image.id, image)
  }
  const template = document.createElement('template'); template.innerHTML = html
  let nodes = 0, text = 0, hasContent = false
  function visit(node: Node, depth: number): PreviewNode[] {
    if (++nodes > DOCX_LIMITS.nodes || depth > 100) throw Error('预览结构超过限额。')
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent ?? ''; text += value.length; if (value.trim()) hasContent = true
      if (text > DOCX_LIMITS.text) throw Error('文字超过限额。')
      return [{ text: value }]
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return []
    const element = node as Element, tag = element.localName.toLowerCase()
    if (forbidden.has(tag)) return []
    if (tag === 'img') {
      const id = element.getAttribute('src') ?? ''
      if (!byId.has(id)) throw Error('图片内容无法安全预览。')
      hasContent = true; return [{ tag: 'img', image: id }]
    }
    const children = Array.from(node.childNodes).flatMap(n => visit(n, depth + 1))
    if (!tags.has(tag)) return children
    const result: PreviewNode = { tag, children }
    if (tag === 'td' || tag === 'th') for (const key of ['colspan', 'rowspan'] as const) {
      const value = element.getAttribute(key)
      if (value && /^[1-9]\d?$/.test(value)) result[key] = Number(value)
    }
    return [result]
  }
  const model = Array.from(template.content.childNodes).flatMap(n => visit(n, 0))
  if (!hasContent) throw Error('没有可转换正文。')
  return { model, images: [...byId.values()] }
}
