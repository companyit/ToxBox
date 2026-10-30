/// <reference types="vite/client" />

declare const __WORKDEV_SEO_CONFIG__: Readonly<{
  raw: import('./src/utils/seoEnvironment.ts').RawSeoEnvironment
  approvedConfig: import('./src/utils/seoEnvironment.ts').ApprovedSeoConfig
}>
