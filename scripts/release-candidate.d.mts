import type { Buffer } from 'node:buffer'
import type { ApprovedSeoConfig, RawSeoEnvironment } from '../src/utils/seoEnvironment.ts'

// 仅描述相邻 JavaScript 模块的接口，不检查其内部实现。
export type SeoMode = NonNullable<RawSeoEnvironment['mode']>
export type NormalizedSeoInput = RawSeoEnvironment & (
  | { readonly mode: 'local' | 'preview'; readonly origin?: never }
  | { readonly mode: 'production'; readonly origin: string }
)
export interface SeoEnvelope {
  readonly raw: NormalizedSeoInput
  readonly approvedConfig: ApprovedSeoConfig
}
export interface FileDigest {
  readonly size: number
  readonly sha256: string
}
export type DirectoryDigest = Readonly<Record<string, FileDigest>>
export interface CandidateInputSnapshot {
  readonly head: string
  readonly dirtyDiffSha256: string
  readonly node: string
  readonly versions: Readonly<Record<'vite' | 'vue' | 'vue-router' | '@playwright/test', string>>
  readonly files: Readonly<Record<string, string>>
}
export interface CandidateValidation {
  readonly htmlFiles: readonly string[]
  readonly mode: SeoMode
  readonly canonicalUrls: readonly string[]
  readonly publicFiles: readonly string[]
  readonly manifestSha256: string
}
export interface CandidateReceipt {
  readonly schemaVersion: 1
  readonly status: 'validated'
  readonly candidateId: string
  readonly started: string
  readonly finished: string
  readonly seo: SeoEnvelope
  readonly seoSha256: string
  readonly input: CandidateInputSnapshot
  readonly protectedDirectories: Readonly<Record<'dist-ssg' | '.ssg-build', DirectoryDigest | null>>
  readonly output: { readonly root: 'output/dist-ssg'; readonly files: DirectoryDigest }
  readonly ssrManifest: { readonly path: 'metadata/ssr-manifest.json'; readonly sha256: string }
  readonly validation: CandidateValidation
}
export interface VerifiedCandidate {
  readonly id: string
  readonly root: string
  readonly output: string
  readonly manifestPath: string
  readonly envelope: SeoEnvelope
  readonly receipt: CandidateReceipt
  readonly receiptSha256: string
}
export interface ViteSeoContext {
  readonly envelope: SeoEnvelope
  readonly candidate: VerifiedCandidate | null
}
export type BuildCandidateOptions =
  | { readonly candidateId: string; readonly mode: 'preview'; readonly origin?: never }
  | { readonly candidateId: string; readonly mode: 'production'; readonly origin: string }
export interface BuiltCandidate {
  readonly candidateId: string
  readonly receipt: string
  readonly receiptSha256: string
}
export interface PreviewExit {
  readonly code: number | null
  readonly signal: NodeJS.Signals | null
}
export const repositoryRoot: string
export function validateCandidateId(id: unknown): string
export function assertSafePath(filename: string, options?: { readonly directory?: boolean }): Promise<string>
export function readSafeFile(filename: string): Promise<Buffer>
export function digestDirectory(directory: string): Promise<DirectoryDigest>
export function createSeoEnvelope(raw: unknown): Promise<SeoEnvelope>
export function inputSnapshot(): Promise<CandidateInputSnapshot>
export function verifyCandidate(receiptPath: string, expectedSha: string): Promise<VerifiedCandidate>
export function resolveViteSeoContext(isPreview: boolean): Promise<ViteSeoContext>
export function buildCandidate(options: BuildCandidateOptions): Promise<BuiltCandidate>
export function previewCandidate(receiptPath: string, expectedSha: string): Promise<PreviewExit>
