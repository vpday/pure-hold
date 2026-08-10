import type { IndexGroupDefinition } from '../../models/indexGroupDefinition'
import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import {
  INDEX_SETTINGS_SCHEMA_VERSION,
  indexGroupsStorageKey,
} from './indexSettingsSchemaVersion.ts'

export function saveIndexGroups(groups: readonly IndexGroupDefinition[]): void {
  if (!isIndexGroups(groups)) {
    throw new TypeError('Index groups have an invalid shape')
  }

  const result = browserStorageAdapter.write(
    indexGroupsStorageKey,
    JSON.stringify({
      groups,
      version: INDEX_SETTINGS_SCHEMA_VERSION,
    }),
  )
  if (!result.ok) {
    throw result.error
  }
}

function isIndexGroups(value: unknown): value is readonly IndexGroupDefinition[] {
  return Array.isArray(value) && value.every(isIndexGroupDefinition)
}

function isIndexGroupDefinition(value: unknown): value is IndexGroupDefinition {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    Array.isArray(value.quoteCodes) &&
    value.quoteCodes.every((quoteCode) => typeof quoteCode === 'string')
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
