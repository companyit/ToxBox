export type PageName = 'home' | 'office' | 'text-statistics' | 'developer' | 'json-formatter' | 'url-encoder' | 'about' | 'privacy'
export type ToolPageName = Extract<PageName, 'text-statistics' | 'json-formatter' | 'url-encoder'>
export interface PageDefinition {
  readonly routeName: PageName | 'not-found'
  readonly path: string
  readonly heading: string
  readonly title: string
  readonly description: string
  readonly indexable: boolean
}
const page = (routeName: PageName, path: string, heading: string, description: string): PageDefinition => ({
  routeName, path, heading, title: routeName === 'home' ? heading : `${heading}｜WorkDev Tools`, description, indexable: true,
})
export const pages: readonly PageDefinition[] = [
  page('home', '/', 'WorkDev Tools — 办公与开发者在线工具', '免费免登录的办公与开发者工具，文本统计、JSON 格式化与 URL 编解码在浏览器本地处理。'),
  page('office', '/office/', '办公工具', '浏览办公工具，使用文本统计查看字符、词段与行数，内容在浏览器本地处理。'),
  page('text-statistics', '/office/text-statistics/', '文本统计', '本地统计 Unicode 码点字符、去空白字符、词段、总行与非空行；词段不等于中文分词。'),
  page('developer', '/developer/', '开发者工具', '浏览 JSON 格式化与校验、URL 编解码工具，免费免登录，本地处理输入。'),
  page('json-formatter', '/developer/json-formatter/', 'JSON 格式化与校验', '校验 JSON，选择 2 或 4 空格格式化或压缩；提供数字精度风险说明和安全拒绝提示。'),
  page('url-encoder', '/developer/url-encoder/', 'URL 编解码', '使用 URI 组件或完整 URI 模式进行单轮编码与解码，保留加号的原生语义。'),
  page('about', '/about/', '关于 WorkDev Tools', '了解 WorkDev Tools 的产品定位、本地处理原则与当前工具范围。'),
  page('privacy', '/privacy/', '隐私说明', '了解工具输入的本地处理、不自动保存、复制权限及网站静态资源请求边界。'),
]
export const notFoundPage: PageDefinition = { routeName: 'not-found', path: '', heading: '页面不存在', title: '页面不存在｜WorkDev Tools', description: '请求的页面不存在，请返回首页或浏览工具分类。', indexable: false }
export function getPage(name: unknown): PageDefinition {
  return pages.find(p => p.routeName === name) ?? notFoundPage
}
export function canonicalPath(path: string): string | undefined {
  return pages.find(p => p.path === path || (p.path !== '/' && p.path.slice(0, -1) === path))?.path
}
