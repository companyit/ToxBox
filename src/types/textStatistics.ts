export interface TextStatistics {
  characterCount: number
  nonWhitespaceCharacterCount: number
  segmentCount: number
  lineCount: number
  nonEmptyLineCount: number
}

export type TextAnalysis =
  | { status: 'ok'; statistics: TextStatistics }
  | { status: 'too-long'; limit: number; actualCodeUnits: number }
