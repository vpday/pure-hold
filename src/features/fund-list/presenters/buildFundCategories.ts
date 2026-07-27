import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition'
import type { FundHolding } from '@/domains/funds/models/fundHolding'

export interface FundCategory {
  readonly fundCodes: readonly string[]
  readonly id: string
  readonly name: string
}

export function buildFundCategories(
  fundOrder: readonly string[],
  groups: readonly FundGroupDefinition[],
  holdingsByCode: Readonly<Record<string, FundHolding>>,
): readonly FundCategory[] {
  return [
    { fundCodes: fundOrder, id: 'all', name: '全部' },
    {
      fundCodes: fundOrder.filter((code) => holdingsByCode[code] !== undefined),
      id: 'holdings',
      name: '持仓',
    },
    ...groups.map((group) => ({
      fundCodes: group.fundCodes,
      id: group.id,
      name: group.name,
    })),
  ]
}
