import type { FundSettings } from '../../models/fundSettings.ts'
import {
  corruptFundSettingsStorageKeyPrefix,
  FUND_SETTINGS_SCHEMA_VERSION,
  fundSettingsStorageKey,
} from './fundSettingsSchemaVersion.ts'
import { saveFundSettings } from './saveFundSettings.ts'
import { validateAndCloneFundSettings } from './validateFundSettings.ts'

export function loadFundSettings(): FundSettings {
  const fallback = createEmptyFundSettings()
  const storage = getLocalStorage()
  if (!storage) {
    return fallback
  }

  requestPersistentStorage()

  let raw: string | null
  try {
    raw = storage.getItem(fundSettingsStorageKey)
  } catch {
    return fallback
  }

  if (raw === null) {
    return fallback
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== FUND_SETTINGS_SCHEMA_VERSION) {
      throw new TypeError('Persisted fund settings have an incompatible version')
    }
    const settings = validateAndCloneFundSettings(parsed, true)
    if (
      JSON.stringify(settings.funds) !== JSON.stringify(parsed.funds) ||
      JSON.stringify(settings.groups) !== JSON.stringify(parsed.groups) ||
      JSON.stringify(settings.holdingOrder) !== JSON.stringify(parsed.holdingOrder) ||
      JSON.stringify(settings.holdingsByCode) !== JSON.stringify(parsed.holdingsByCode)
    ) {
      saveFundSettings(settings)
    }
    return settings
  } catch (error) {
    backupCorruptedData(storage, raw)
    persistRecovery(fallback)
    console.warn('Fund settings were invalid and have been reset.', error)
    return fallback
  }
}

function createEmptyFundSettings(): FundSettings {
  return { funds: [], groups: [], holdingOrder: [], holdingsByCode: {} }
}

function persistRecovery(settings: FundSettings): void {
  try {
    saveFundSettings(settings)
  } catch {
    // Keep the in-memory fallback when storage is unavailable or full.
  }
}

function backupCorruptedData(storage: Storage, raw: string): void {
  try {
    storage.setItem(`${corruptFundSettingsStorageKeyPrefix}${Date.now()}`, raw)
  } catch {
    // Recovery must continue when the backup cannot be written.
  }
}

function requestPersistentStorage(): void {
  if (typeof navigator !== 'undefined') {
    void navigator.storage?.persist().catch(() => {})
  }
}

function getLocalStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
