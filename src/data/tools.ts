import type { Tool } from '@/types/tool'
import { orderTools } from '../utils/toolOrder'

const catalog: readonly Tool[] = [
  { id: 'image-crop', name: '图片尺寸与裁剪', description: '本地拖动或填写坐标裁剪图片，选择固定比例并等比缩小后下载。', category: 'office', status: 'preview', routeName: 'image-crop' },
  { id: 'pdf-organizer', name: 'PDF 页面整理', description: '本地查看缩略图，排序、旋转和删除 PDF 页面后导出。', category: 'office', status: 'preview', routeName: 'pdf-organizer' },
  { id: 'text-workbench', name: '文本处理工作台', description: '串联清理、去重、排序与替换，一次查看步骤统计、最终文本及差异。', category: 'office', status: 'preview', routeName: 'text-workbench' },
  { id: 'text-diff', name: '文本差异对比', description: '本地逐行对比两段文本，查看新增、删除及行号，复制变化报告。', category: 'office', status: 'preview', routeName: 'text-diff' },
  { id: 'json-yaml', name: 'JSON ↔ YAML 转换', description: '本地双向转换 JSON 与 YAML，检查语法、重复键及数据类型。', category: 'developer', status: 'preview', routeName: 'json-yaml' },
  { id: 'image-convert', name: '图片压缩与格式转换', description: '本地批量转换 JPG/PNG/WebP，等比缩小、对比体积并打包下载。', category: 'office', status: 'preview', routeName: 'image-convert' },
  { id: 'images-to-pdf', name: '图片转 PDF', description: '本地 JPG/PNG 多图排序转 PDF，每图一页，选择 A4 方向与边距。', category: 'office', status: 'preview', routeName: 'images-to-pdf' },
  { id: 'date-calculator', name: '日期差与日期加减', description: '计算两个日期的有符号天数差，或日期加减整数天，不依赖时区。', category: 'office', status: 'preview', routeName: 'date-calculator' },
  { id: 'csv-json', name: 'CSV 与 JSON 表格互转', description: '对象数组、嵌套 JSON 与 CSV 本地转换，兼容常见格式并保留数字精度。', category: 'office', status: 'preview', routeName: 'csv-json' },
  { id: 'text-cleanup', name: '文本整理', description: '清理空白、按行去重排序及普通文本批量替换，保留原输入。', category: 'office', status: 'preview', routeName: 'text-cleanup' },
  { id: 'pdf-split', name: 'PDF 拆分与选页导出', description: '按页码选择并保序导出一份 PDF，或逐页拆分下载，全程本地处理。', category: 'office', status: 'preview', routeName: 'pdf-split' },
  { id: 'word-to-pdf', name: 'Word 转 PDF', description: '本地 DOCX 简版预览，通过浏览器打印另存 PDF，接受排版差异。', category: 'office', status: 'preview', routeName: 'word-to-pdf' },
  { id: 'pdf-merge', name: 'PDF 合并', description: '本地合并多份 PDF，调整顺序后下载，不上传文档。', category: 'office', status: 'preview', routeName: 'pdf-merge' },
  { id: 'totp', name: '2FA 动态验证码', description: '支持密钥及 otpauth 链接导入，本地生成 6/8 位动态验证码，不保存密钥。', category: 'developer', status: 'preview', routeName: 'totp' },
  {
    id: 'text-stats',
    name: '文本统计',
    description: '了解文本的字符数量与行数，让日常内容整理更轻松。',
    category: 'office',
    status: 'preview',
    routeName: 'text-statistics',
  },
  {
    id: 'json-formatter',
    name: 'JSON 格式化与校验',
    description: '整理 JSON 结构、检查格式，让数据更易阅读。',
    category: 'developer',
    status: 'preview',
    routeName: 'json-formatter',
  },
  {
    id: 'url-codec',
    name: 'URL 编解码',
    description: '按 URI 组件或完整 URI 模式，手动编码与解码文本。',
    category: 'developer',
    status: 'preview',
    routeName: 'url-encoder',
  },
  { id: 'base64', name: 'Base64 编解码', description: '标准 Base64 与 UTF-8 文本本地互转。', category: 'developer', status: 'preview', routeName: 'base64' },
  { id: 'timestamp', name: '时间戳转换', description: '秒、毫秒时间戳与 UTC 或 UTC+08:00 日期互转。', category: 'developer', status: 'preview', routeName: 'timestamp' },
  { id: 'uuid', name: 'UUID 生成', description: '使用安全随机数单次或批量生成 UUID v4。', category: 'developer', status: 'preview', routeName: 'uuid' },
]

export const tools: readonly Tool[] = orderTools(catalog)
