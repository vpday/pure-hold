import { defaultIndexDefinitions } from '../../config/defaultIndexDefinitions.ts'
import { defaultIndexGroups } from '../../config/defaultIndexGroups.ts'
import type { IndexGroupDefinition } from '../../models/indexGroupDefinition'
import { validateIndexGroups } from '../../models/validateIndexGroups.ts'
import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
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
  const knownQuoteCodes = new Set(defaultIndexDefinitions.map(({ quoteCode }) => quoteCode))
  const fallbackValidation = validateIndexGroups(defaultIndexGroups, knownQuoteCodes)
  if (!fallbackValidation.ok) {
    throw new Error(`Default index groups are invalid: ${fallbackValidation.issue.code}`)
  }
  const fallbackGroups = fallbackValidation.groups
  browserStorageAdapter.requestPersistence()
  const result = browserStorageAdapter.read(indexGroupsStorageKey)
  if (result.status === 'failed') {
    return fallbackGroups
  }
  if (result.status === 'missing') {
    persistRecovery(fallbackGroups)
    return fallbackGroups
  }
  const raw = result.value

  try {
    const persisted = parsePersistedIndexGroups(raw)
    const validation = validateIndexGroups(persisted.groups, knownQuoteCodes)
    if (!validation.ok) {
      throw new TypeError(`Persisted index groups are invalid: ${validation.issue.code}`)
    }
    return validation.groups
  } catch (error) {
    backupCorruptedData(raw)
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

function persistRecovery(groups: readonly IndexGroupDefinition[]): void {
  try {
    saveIndexGroups(groups)
  } catch {
    // Keep the in-memory fallback when storage is unavailable or full.
  }
}

function backupCorruptedData(raw: string): void {
  browserStorageAdapter.write(`${corruptIndexGroupsStorageKeyPrefix}${Date.now()}`, raw)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
