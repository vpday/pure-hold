import type { FundSettings } from '../../models/fundSettings.ts'
import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import {
  corruptFundSettingsStorageKeyPrefix,
  FUND_SETTINGS_SCHEMA_VERSION,
  fundSettingsStorageKey,
} from './fundSettingsSchemaVersion.ts'
import { saveFundSettings } from './saveFundSettings.ts'
import { validateAndCloneFundSettings } from './validateFundSettings.ts'

export function loadFundSettings(): FundSettings {
  const fallback = createEmptyFundSettings()
  browserStorageAdapter.requestPersistence()
  const result = browserStorageAdapter.read(fundSettingsStorageKey)
  if (result.status !== 'found') {
    return fallback
  }
  const raw = result.value

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
    backupCorruptedData(raw)
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

function backupCorruptedData(raw: string): void {
  browserStorageAdapter.write(`${corruptFundSettingsStorageKeyPrefix}${Date.now()}`, raw)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
