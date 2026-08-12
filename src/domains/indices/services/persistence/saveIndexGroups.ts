import { defaultIndexDefinitions } from '../../config/defaultIndexDefinitions.ts'
import type { IndexGroupDefinition } from '../../models/indexGroupDefinition'
import { validateIndexGroups } from '../../models/validateIndexGroups.ts'
import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import {
  INDEX_SETTINGS_SCHEMA_VERSION,
  indexGroupsStorageKey,
} from './indexSettingsSchemaVersion.ts'

export function saveIndexGroups(groups: readonly IndexGroupDefinition[]): void {
  const validation = validateIndexGroups(
    groups,
    new Set(defaultIndexDefinitions.map(({ quoteCode }) => quoteCode)),
  )
  if (!validation.ok) {
    throw new TypeError(`Index groups are invalid: ${validation.issue.code}`)
  }

  const result = browserStorageAdapter.write(
    indexGroupsStorageKey,
    JSON.stringify({
      groups: validation.groups,
      version: INDEX_SETTINGS_SCHEMA_VERSION,
    }),
  )
  if (!result.ok) {
    throw result.error
  }
}
