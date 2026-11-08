import { site } from './site.ts'
import { indexablePages } from './indexing.ts'
export type PageName = 'image-crop' | 'pdf-organizer' | 'text-workbench' | 'text-diff' | 'json-yaml' | 'image-convert' | 'images-to-pdf' | 'date-calculator' | 'csv-json' | 'text-cleanup' | 'pdf-split' | 'word-to-pdf' | 'pdf-merge' | 'home' | 'office' | 'text-statistics' | 'developer' | 'json-formatter' | 'url-encoder' | 'about' | 'privacy' | 'totp' | 'base64' | 'timestamp' | 'uuid' | 'contact' | 'terms'
export type ToolPageName = Extract<PageName, 'image-crop' | 'pdf-organizer' | 'text-workbench' | 'text-diff' | 'json-yaml' | 'image-convert' | 'images-to-pdf' | 'date-calculator' | 'csv-json' | 'text-cleanup' | 'pdf-split' | 'word-to-pdf' | 'pdf-merge' | 'text-statistics' | 'json-formatter' | 'url-encoder' | 'totp' | 'base64' | 'timestamp' | 'uuid'>
export interface PageDefinition {
  readonly routeName: PageName | 'not-found'
  readonly path: string
  readonly heading: string
  readonly title: string
  readonly description: string
  readonly indexable: boolean
}
const searchTitles: Readonly<Partial<Record<PageName, string>>> = {
  "home": "免费在线工具箱：PDF、图片、文本与开发工具",
  "office": "在线办公工具：PDF合并拆分、图片处理与文本整理",
  "developer": "开发者在线工具：JSON、Base64、时间戳与URL",
  "image-convert": "图片压缩与格式转换：JPG、PNG、WebP在线处理",
  "image-crop": "图片裁剪与尺寸调整：自定义坐标、比例与像素",
  "images-to-pdf": "图片转PDF：JPG、PNG多图排序合成A4文档",
  "pdf-merge": "PDF合并：多份文档排序合成一个PDF",
  "pdf-split": "PDF拆分与提取页面：按页码选页导出",
  "pdf-organizer": "PDF页面整理：缩略图排序、旋转与删除页面",
  "word-to-pdf": "DOCX转PDF：Word简版预览与打印另存",
  "json-formatter": "JSON格式化与校验：美化、压缩和语法检查",
  "json-yaml": "JSON与YAML在线互转：语法校验与格式转换",
  "base64": "Base64在线编码解码：UTF-8中文文本互转",
  "url-encoder": "URL在线编码解码：URI组件与完整链接转换",
  "uuid": "UUID在线生成器：单个或批量生成UUID v4",
  "timestamp": "时间戳在线转换：秒、毫秒与UTC日期互转",
  "text-statistics": "字数与字符统计：文本行数、去空白字符计数",
  "text-cleanup": "文本整理：去空白、按行去重排序与批量替换",
  "text-diff": "文本差异对比：逐行比较、增删统计与变化报告",
  "text-workbench": "文本处理工作台：批量清理、去重、排序与替换",
  "csv-json": "CSV与JSON在线互转：二维字符串表格转换",
  "date-calculator": "日期计算器：计算相差天数与日期加减"
}
const page = (routeName: PageName, path: string, heading: string, description: string): PageDefinition => ({
  routeName, path, heading, title: `${searchTitles[routeName] ?? heading}｜${site.displayName}`, description, indexable: indexablePages.some(page => page.routeName === routeName && page.path === path),
})
export const pages: readonly PageDefinition[] = [
  page('home', '/', `${site.displayName} — 办公与开发者在线工具`, '免费免登录的在线工具箱，提供PDF合并拆分、图片压缩裁剪、文本整理、JSON格式化、Base64及时间戳转换，工具内容在浏览器本地处理。'),
  page('image-crop', '/office/image-crop/', '图片尺寸与裁剪', '本地矩形裁剪 JPG、PNG、WebP，支持固定比例、拖动与数值坐标及等比缩小，不上传图片。'),
  page('pdf-organizer', '/office/pdf-organizer/', 'PDF 页面整理', '在浏览器本地查看 PDF 缩略图，排序、旋转和删除页面后导出，不上传文档。'),
  page('text-workbench', '/office/text-workbench/', '文本处理工作台', '本地串联清理、去重、排序及替换，一次查看每步统计、最终文本和原文差异，不上传内容。'),
  page('text-diff', '/office/text-diff/', '文本差异对比', '在本地逐行对比两段文本，查看新增、删除和行号，支持仅看变化及复制报告，不上传内容。'),
  page('json-yaml', '/developer/json-yaml/', 'JSON ↔ YAML 转换', '本地双向转换 JSON 与 YAML 1.2，检查语法和重复键，支持复制结果，不上传配置内容。'),
  page('image-convert', '/office/image-convert/', '图片压缩与格式转换', '本地批量转换 JPG、PNG、WebP，等比缩小并对比体积，支持单张及 ZIP 下载，不上传图片。'),
  page('images-to-pdf', '/office/images-to-pdf/', '图片转 PDF', '本地将 JPG/PNG 按顺序转为每图一页 A4 PDF，支持方向和边距，不上传图片。'),
  page('date-calculator', '/office/date-calculator/', '日期差与日期加减', '本地计算有符号公历日期差或日期加减整数天，不依赖设备时区。'),
  page('pdf-merge', '/office/pdf-merge/', 'PDF 合并', '本地按文件顺序合并 PDF，支持键盘排序、取消和下载，不上传文档。'),
  page('word-to-pdf', '/office/word-to-pdf/', 'Word 转 PDF（DOCX 简版）', '将DOCX在浏览器本地重排为简版预览，通过打印对话框另存PDF。不上传文件；不支持旧DOC，不保证还原Word原版式。'),
  page('pdf-split', '/office/pdf-split/', 'PDF 拆分与选页导出', '本地按指定页码顺序导出 PDF，或逐页拆分下载，不上传文件。'),
  page('text-cleanup', '/office/text-cleanup/', '文本整理', '本地清理行首尾空白、删除空白行、去重、排序及普通文本替换，保留原输入。'),
  page('csv-json', '/office/csv-json/', 'CSV 与 JSON 表格互转', '本地转换逗号 CSV 与二维字符串数组，保留前导零，不推断表头或类型。'),
  page('office', '/office/', '办公工具', '在线处理PDF合并、拆分和页面排序，转换或裁剪图片、图片转PDF、统计字数和整理文本。免费免登录，所选文档在浏览器本地处理，不上传内容。'),
  page('text-statistics', '/office/text-statistics/', '文本统计', '本地统计 Unicode 码点字符、去空白字符、词段、总行与非空行；词段不等于中文分词。'),
  page('developer', '/developer/', '开发者工具', '免费使用JSON格式化与校验、JSON/YAML互转、Base64、URL编解码、时间戳和UUID工具。支持中文提示，配置和文本在浏览器本地处理。'),
  page('json-formatter', '/developer/json-formatter/', 'JSON 格式化与校验', '在线校验JSON语法，选择2或4空格美化缩进或压缩；提供中文错误与数字精度风险提示，数据仅在浏览器本地处理。'),
  page('url-encoder', '/developer/url-encoder/', 'URL 编解码', '使用 URI 组件或完整 URI 模式进行单轮编码与解码，保留加号的原生语义。'),
  { ...page('totp', '/developer/2fa/', '2FA 动态验证码', '输入密钥或导入 otpauth 链接，本地生成 6/8 位 TOTP 验证码，识别算法与周期，不保存密钥。'), indexable: false },
  page('base64', '/developer/base64/', 'Base64 编解码', '标准 Base64 与 UTF-8 文本在浏览器本地互转。'),
  page('timestamp', '/developer/timestamp/', '时间戳转换', '秒或毫秒 Unix 时间戳与 UTC、固定 UTC+08:00 日期互转。'),
  page('uuid', '/developer/uuid/', 'UUID 生成', '使用浏览器安全随机数单次或批量生成 UUID v4，支持全部复制。'),
  page('about', '/about/', `关于${site.name}`, `了解${site.displayName}的产品定位、本地处理原则与当前工具范围。`),
  { ...page('contact', '/contact/', '联系我们', '通过公开邮箱反馈工具问题、功能建议、内容纠错或隐私咨询。'), indexable: false },
  { ...page('terms', '/terms/', '服务条款', `了解${site.displayName}的服务范围、合理使用、结果局限与使用条款。`), indexable: false },
  page('privacy', '/privacy/', '隐私政策', '了解工具输入的本地处理、不自动保存、复制权限及网站静态资源请求边界。'),
]
export const notFoundPage: PageDefinition = { routeName: 'not-found', path: '', heading: '页面不存在', title: `页面不存在｜${site.displayName}`, description: '请求的页面不存在，请返回首页或浏览工具分类。', indexable: false }
export function getPage(name: unknown): PageDefinition {
  return pages.find(p => p.routeName === name) ?? notFoundPage
}
export function canonicalPath(path: string): string | undefined {
  return pages.find(p => p.path === path || (p.path !== '/' && p.path.slice(0, -1) === path))?.path
}
