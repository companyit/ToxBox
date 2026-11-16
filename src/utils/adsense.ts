import config from '../../config/adsense-readiness.json' with { type: 'json' }
import type { SeoEnvironment } from '../types/seo'
export const ADSENSE_SCRIPT_ID = 'workdev-adsense'
export function isAdSensePath(path: string): boolean {
  if (!path.startsWith('/')) return false
  const normalized = path.endsWith('/') ? path : path + '/'
  return config.allowedPaths.includes(normalized)
}
export function adSenseScriptFor(path: string, environment: SeoEnvironment, enabled = config.adScriptEnabled): string | undefined {
  return enabled && environment.mode === 'production' && environment.approvedOrigin === config.productionOrigin && isAdSensePath(path)
    ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.publisherId}` : undefined
}
export function adSenseDocumentTransition(currentPath: string, nextPath: string, environment: SeoEnvironment): boolean {
  return Boolean(adSenseScriptFor(currentPath, environment)) !== Boolean(adSenseScriptFor(nextPath, environment))
}
