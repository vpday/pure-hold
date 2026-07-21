import type { IndexGroupDefinition } from '../models/indexGroupDefinition'
import type { IndexDefinition } from '../models/indexDefinition'

export function selectActiveIndexDefinitions(
  definitions: readonly IndexDefinition[],
  groups: readonly IndexGroupDefinition[],
): readonly IndexDefinition[] {
  const definitionsByQuoteCode = new Map(
    definitions.map((definition) => [definition.quoteCode, definition]),
  )
  const selected = new Set<string>()
  const activeDefinitions: IndexDefinition[] = []

  for (const group of groups) {
    for (const quoteCode of group.quoteCodes) {
      const definition = definitionsByQuoteCode.get(quoteCode)
      if (definition && !selected.has(quoteCode)) {
        selected.add(quoteCode)
        activeDefinitions.push(definition)
      }
    }
  }

  return activeDefinitions
}
