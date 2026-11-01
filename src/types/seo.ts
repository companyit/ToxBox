import type { PageName } from '../data/pages.ts'

export interface SeoEnvironment {
  readonly mode: 'local' | 'preview' | 'production'
  readonly approvedOrigin?: string
  readonly indexableRouteNames?: readonly PageName[]
}
