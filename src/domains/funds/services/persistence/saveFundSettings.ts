import type { FundSettings } from '../../models/fundSettings.ts'
import {
  FUND_SETTINGS_SCHEMA_VERSION,
  fundSettingsStorageKey,
} from './fundSettingsSchemaVersion.ts'
import { validateAndCloneFundSettings } from './validateFundSettings.ts'

export function saveFundSettings(settings: FundSettings, storage?: Storage): void {
  const validated = validateAndCloneFundSettings(settings)
  const targetStorage = storage ?? getLocalStorage()
  if (!targetStorage) {
    throw new Error('localStorage is unavailable')
  }

  targetStorage.setItem(
    fundSettingsStorageKey,
    JSON.stringify({ ...validated, version: FUND_SETTINGS_SCHEMA_VERSION }),
  )
}

function getLocalStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}
