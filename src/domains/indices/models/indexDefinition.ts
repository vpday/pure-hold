export type IndexMarket = 'cn' | 'hk' | 'us'

export interface IndexDefinition {
  readonly id: string
  readonly market: IndexMarket
  readonly name: string
  readonly quoteCode: string
  readonly securityCode: string
}
