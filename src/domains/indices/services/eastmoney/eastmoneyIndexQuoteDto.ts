export interface EastmoneyIndexQuoteDto {
  readonly changeAmount: unknown
  readonly changePercent: unknown
  readonly price: unknown
  readonly quoteCode: string
  readonly quotedAt: unknown
  readonly securityCode: string
  readonly sourceName: unknown
}

export interface EastmoneyQuoteParseResult {
  readonly dtos: readonly EastmoneyIndexQuoteDto[]
  readonly malformedRecordCount: number
}
