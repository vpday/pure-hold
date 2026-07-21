import type { IndexDefinition } from '../models/indexDefinition'

export function selectOpenMarketIndexDefinitions(
  definitions: readonly IndexDefinition[],
  openMarkets: ReadonlySet<string>,
): readonly IndexDefinition[] {
  return definitions.filter((definition) =>
    definition.refreshMarketCodes.some((market) => openMarkets.has(market)),
  )
}
