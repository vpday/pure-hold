export interface IndexDefinition {
  readonly id: string
  readonly quoteCode: string
  readonly securityCode: string
  readonly name: string
  readonly sectorNames: readonly string[] | null
  readonly sectorCodes: readonly string[] | null
  readonly typeName: string | null
  readonly typeCode: string | null
  readonly indexType: string | null
  readonly quoteMarketCode: string
  readonly refreshMarketCodes: readonly string[]
}
