export interface OrganizerPage { sourceIndex: number; rotationDelta: number }
export interface OrganizerGeometry { view: number[]; rotation: number }
export const ORGANIZER_LIMITS = { bytes: 20 * 1024 ** 2, pages: 100, outputBytes: 100 * 1024 ** 2 }
export function validateOrganizerFile(file: Pick<File, 'name' | 'size'>) {
  if (!/\.pdf$/i.test(file.name) || !file.size || file.size > ORGANIZER_LIMITS.bytes) throw Error('请选择非空 PDF，每份最多 20 MiB。')
}
export function initialOrganizerPlan(count: number): OrganizerPage[] {
  if (!Number.isInteger(count) || count < 1 || count > ORGANIZER_LIMITS.pages) throw Error('PDF 页数须为 1～100 页。')
  return Array.from({ length: count }, (_, sourceIndex) => ({ sourceIndex, rotationDelta: 0 }))
}
export function validateOrganizerPlan(plan: readonly OrganizerPage[], count: number) {
  initialOrganizerPlan(count)
  if (!Array.isArray(plan) || !plan.length || plan.length > count) throw Error('至少保留一页，不能重复页面。')
  const seen = new Set<number>()
  for (const item of plan) {
    if (!item || !Number.isInteger(item.sourceIndex) || item.sourceIndex < 0 || item.sourceIndex >= count || seen.has(item.sourceIndex) || ![0, 90, 180, 270].includes(item.rotationDelta)) throw Error('页面排列或旋转参数无效。')
    seen.add(item.sourceIndex)
  }
}
export function moveOrganizerPage(plan: readonly OrganizerPage[], from: number, to: number): OrganizerPage[] {
  if (![from, to].every(n => Number.isInteger(n) && n >= 0 && n < plan.length)) throw Error('页面位置无效。')
  const next = plan.map(p => ({ ...p })); const [item] = next.splice(from, 1); next.splice(to, 0, item!); return next
}
