import type { Plugin } from 'vite'
export function pdfResourceFiles(): Promise<Map<string, { bytes: Uint8Array; size: number; sha256: string }>>
export function pdfResourcesPlugin(): Plugin
