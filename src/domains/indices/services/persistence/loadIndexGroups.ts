import { defaultIndexDefinitions } from '../../config/defaultIndexDefinitions.ts'
import { defaultIndexGroups } from '../../config/defaultIndexGroups.ts'
import type { IndexGroupDefinition } from '../../models/indexGroupDefinition'
import {
  INDEX_SETTINGS_SCHEMA_VERSION,
  corruptIndexGroupsStorageKeyPrefix,
  indexGroupsStorageKey,
} from './indexSettingsSchemaVersion.ts'
import { saveIndexGroups } from './saveIndexGroups.ts'

interface PersistedIndexGroups {
  readonly groups: readonly IndexGroupDefinition[]
  readonly version: number
}

export function loadIndexGroups(): readonly IndexGroupDefinition[] {
  const fallbackGroups = cloneGroups(defaultIndexGroups)
  const storage = getLocalStorage()
  if (!storage) {
    return fallbackGroups
  }

  requestPersistentStorage()

  let raw: string | null
  try {
    raw = storage.getItem(indexGroupsStorageKey)
  } catch {
    return fallbackGroups
  }

  if (raw === null) {
    persistRecovery(fallbackGroups)
    return fallbackGroups
  }

  try {
    const persisted = parsePersistedIndexGroups(raw)
    const groups = filterUnknownQuoteCodes(persisted.groups)
    if (!areGroupsEqual(persisted.groups, groups)) {
      saveIndexGroups(groups)
    }
    return groups
  } catch (error) {
    backupCorruptedData(storage, raw)
    persistRecovery(fallbackGroups)
    console.warn('Index group settings were invalid and have been reset.', error)
    return fallbackGroups
  }
}

function parsePersistedIndexGroups(value: string): PersistedIndexGroups {
  const parsed: unknown = JSON.parse(value)
  if (!isPersistedIndexGroups(parsed)) {
    throw new TypeError('Persisted index groups have an invalid shape')
  }

  return parsed
}

function isPersistedIndexGroups(value: unknown): value is PersistedIndexGroups {
  if (!isRecord(value)) {
    return false
  }

  return (
    value.version === INDEX_SETTINGS_SCHEMA_VERSION &&
    Array.isArray(value.groups) &&
    value.groups.every(isIndexGroupDefinition)
  )
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

function filterUnknownQuoteCodes(
  groups: readonly IndexGroupDefinition[],
): readonly IndexGroupDefinition[] {
  const knownQuoteCodes = new Set(defaultIndexDefinitions.map((definition) => definition.quoteCode))
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    quoteCodes: group.quoteCodes.filter((quoteCode) => knownQuoteCodes.has(quoteCode)),
  }))
}

function cloneGroups(groups: readonly IndexGroupDefinition[]): IndexGroupDefinition[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    quoteCodes: [...group.quoteCodes],
  }))
}

function areGroupsEqual(
  first: readonly IndexGroupDefinition[],
  second: readonly IndexGroupDefinition[],
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (group, index) =>
        group.id === second[index]?.id &&
        group.name === second[index]?.name &&
        group.quoteCodes.length === second[index]?.quoteCodes.length &&
        group.quoteCodes.every(
          (quoteCode, quoteCodeIndex) => quoteCode === second[index]?.quoteCodes[quoteCodeIndex],
        ),
    )
  )
}

function persistRecovery(groups: readonly IndexGroupDefinition[]): void {
  try {
    saveIndexGroups(groups)
  } catch {
    // Keep the in-memory fallback when storage is unavailable or full.
  }
}

function backupCorruptedData(storage: Storage, raw: string): void {
  try {
    storage.setItem(`${corruptIndexGroupsStorageKeyPrefix}${Date.now()}`, raw)
  } catch {
    // Recovery must still continue if the backup cannot be written.
  }
}

function requestPersistentStorage(): void {
  if (typeof navigator === 'undefined') {
    return
  }

  void navigator.storage?.persist().catch(() => {})
}

function getLocalStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
