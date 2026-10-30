import { resolveSeoEnvironment } from '../utils/seoEnvironment.ts'

// Only the build-time public envelope is accepted. No host/env/DOM fallback.
if (typeof __WORKDEV_SEO_CONFIG__ === 'undefined') throw new Error('缺少构建期SEO配置。')
const envelope: unknown = __WORKDEV_SEO_CONFIG__
if (typeof envelope !== 'object' || envelope === null || Array.isArray(envelope)) throw new Error('构建期SEO信封无效。')
const prototype = Object.getPrototypeOf(envelope)
if (prototype !== Object.prototype && prototype !== null) throw new Error('构建期SEO信封原型无效。')
const keys = Reflect.ownKeys(envelope)
if (keys.length !== 2 || !keys.includes('raw') || !keys.includes('approvedConfig')) throw new Error('构建期SEO信封字段无效。')
const raw = Object.getOwnPropertyDescriptor(envelope, 'raw')
const approved = Object.getOwnPropertyDescriptor(envelope, 'approvedConfig')
if (!raw || !approved || !('value' in raw) || !('value' in approved)) throw new Error('构建期SEO信封不允许动态属性。')

export const siteSeoEnvironment = resolveSeoEnvironment(raw.value, approved.value)
