import type { CandidateValidation, SeoEnvelope } from './release-candidate.mjs'

// 接受原验证器的合成页面夹具，不收窄为正式 PageName。
export interface PageValidationInput {
  readonly routeName: string
  readonly path: string
  readonly title: string
  readonly description: string
}
export interface GenerateCandidateOptions {
  readonly candidateRoot: string
  readonly envelope: SeoEnvelope
}
export interface GeneratedCandidate {
  readonly staging: string
  readonly manifestPath: string
  readonly validation: CandidateValidation
}
export function validatePages(pages: readonly PageValidationInput[]): void
export function validateHtml(html: string, directory: string): Promise<void>
export function contentTypeFor(filename: string): string
export function validateCandidateOutput(directory: string, envelope: SeoEnvelope, manifestPath: string): Promise<CandidateValidation>
export function generateCandidate(options: GenerateCandidateOptions): Promise<GeneratedCandidate>
