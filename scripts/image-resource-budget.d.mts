export interface ImageResourceGroup { files: { resource: string; bytes: number; gzipBytes: number }[]; bytes: number; gzipBytes: number }
export interface ImageResourceMetrics { shared: ImageResourceGroup; cropWorker: ImageResourceGroup; convertWorker: ImageResourceGroup; pdfModules: string[] }
export const imageResourceBudgets: Readonly<{ shared: number; cropWorker: number; convertWorker: number }>
export function collectImageResourceSizes(directory?: string, manifestPath?: string): Promise<ImageResourceMetrics>
export function validateImageResourceBudgets(metrics: ImageResourceMetrics): void
