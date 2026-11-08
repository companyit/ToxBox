import { tools } from '../data/tools'
import { getPage } from '../data/pages'

// Only obsolete home-page tool anchors are recognized; destinations come from the approved catalog.
export function legacyToolPath(pathname: string, hash: string): string | undefined {
  if (pathname !== '/' || !hash.startsWith('#')) return
  let name: string
  try { name = decodeURIComponent(hash.slice(1)) } catch { return }
  const tool = tools.find(tool => tool.status === 'preview' && tool.routeName === name)
  return tool?.status === 'preview' ? getPage(tool.routeName).path : undefined
}
