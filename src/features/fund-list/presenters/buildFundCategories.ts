import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition'

export interface FundCategory {
  readonly fundCodes: readonly string[]
  readonly id: string
  readonly name: string
}

export function buildFundCategories(
  fundOrder: readonly string[],
  holdingOrder: readonly string[],
  groups: readonly FundGroupDefinition[],
): readonly FundCategory[] {
  return [
    { fundCodes: fundOrder, id: 'all', name: '全部' },
    { fundCodes: holdingOrder, id: 'holdings', name: '持仓' },
    ...groups.map((group) => ({
      fundCodes: group.fundCodes,
      id: group.id,
      name: group.name,
    })),
  ]
}
