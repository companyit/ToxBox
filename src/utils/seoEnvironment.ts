import { pages, type PageName } from '../data/pages.ts'
import type { SeoEnvironment } from './seo.ts'

// 固定批准集合；页面目录新增条目不会自动加入。
export const approvedIndexablePages = Object.freeze([
  { routeName: 'home', path: '/' },
  { routeName: 'office', path: '/office/' },
  { routeName: 'text-statistics', path: '/office/text-statistics/' },
  { routeName: 'developer', path: '/developer/' },
  { routeName: 'json-formatter', path: '/developer/json-formatter/' },
  { routeName: 'url-encoder', path: '/developer/url-encoder/' },
  { routeName: 'about', path: '/about/' },
  { routeName: 'privacy', path: '/privacy/' },
].map(page => Object.freeze(page)))

export interface ApprovedSeoConfig {
  readonly schemaVersion: 1
  readonly productionOrigin: string
  readonly indexableRouteNames: readonly PageName[]
}
export interface RawSeoEnvironment {
  readonly mode?: 'local' | 'preview' | 'production'
  readonly origin?: string
}
export interface ResolvedSeoEnvironment extends SeoEnvironment {
  readonly indexableRouteNames: readonly PageName[]
}

function record(value: unknown, allowed: readonly string[], label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}必须是配置对象。`)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new Error(`${label}包含不支持的原型。`)
  const result: Record<string, unknown> = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new Error(`${label}包含未知或冲突字段。`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (!('value' in descriptor)) throw new Error(`${label}不允许动态属性。`)
    result[key] = descriptor.value
  }
  return result
}

/** 仅解析显式参数；部署域名准入与通用PageHead的测试origin能力分离。 */
export function resolveSeoEnvironment(raw: unknown, approvedConfig: unknown): ResolvedSeoEnvironment {
  const config = record(approvedConfig, ['schemaVersion', 'productionOrigin', 'indexableRouteNames'], '批准SEO配置')
  if (config.schemaVersion !== 1 || config.productionOrigin !== 'https://www.v7luck.com') {
    throw new Error('批准SEO配置的版本或正式origin不一致。')
  }
  const names = config.indexableRouteNames
  if (!Array.isArray(names) || names.length !== approvedIndexablePages.length
    || names.some(name => typeof name !== 'string') || new Set(names).size !== names.length
    || approvedIndexablePages.some(page => !names.includes(page.routeName))
    || approvedIndexablePages.some(page => !pages.some(actual => actual.routeName === page.routeName && actual.path === page.path && actual.indexable))) {
    throw new Error('批准SEO索引清单必须与既有八个规范页面完全一致。')
  }
  const input = record(raw === undefined ? {} : raw, ['mode', 'origin'], 'SEO环境')
  const mode = Object.hasOwn(input, 'mode') ? input.mode : 'preview'
  if (mode !== 'local' && mode !== 'preview' && mode !== 'production') throw new Error('SEO环境模式无效。')
  const indexableRouteNames = Object.freeze([...names]) as readonly PageName[]
  if (mode !== 'production') {
    if (Object.hasOwn(input, 'origin')) throw new Error('非production环境不得携带正式origin。')
    return Object.freeze({ mode, indexableRouteNames })
  }
  // 精确匹配同时拒绝http、凭据、端口、path/query/hash、根host及URL归一化别名。
  if (!Object.hasOwn(input, 'mode') || input.origin !== config.productionOrigin) {
    throw new Error('production必须显式提供完全匹配的已批准HTTPS origin。')
  }
  return Object.freeze({ mode, approvedOrigin: config.productionOrigin, indexableRouteNames })
}
