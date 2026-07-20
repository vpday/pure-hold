import type { IndexDefinition, IndexMarket } from '../models/indexDefinition'

export function selectOpenMarketIndexDefinitions(
  definitions: readonly IndexDefinition[],
  openMarkets: ReadonlySet<IndexMarket>,
): readonly IndexDefinition[] {
  return definitions.filter((definition) => openMarkets.has(definition.market))
}
