import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import {
  defaultAppRefreshPreferences,
  cloneAppRefreshPreferences,
  type AppRefreshPreferences,
} from '../models/appRefreshPreferences.ts'
import {
  APP_SETTINGS_SCHEMA_VERSION,
  appSettingsStorageKey,
  corruptAppSettingsStorageKeyPrefix,
} from './appSettingsSchemaVersion.ts'
import { saveAppRefreshPreferences } from './saveAppRefreshPreferences.ts'
import { validateAndCloneAppRefreshPreferences } from './validateAppRefreshPreferences.ts'

export function loadAppRefreshPreferences(): AppRefreshPreferences {
  const fallback = cloneAppRefreshPreferences(defaultAppRefreshPreferences)
  browserStorageAdapter.requestPersistence()
  const result = browserStorageAdapter.read(appSettingsStorageKey)
  if (result.status === 'failed') {
    return fallback
  }
  if (result.status === 'missing') {
    persistRecovery(fallback)
    return fallback
  }

  try {
    const parsed: unknown = JSON.parse(result.value)
    if (!isRecord(parsed) || parsed.version !== APP_SETTINGS_SCHEMA_VERSION) {
      throw new TypeError('Persisted app settings have an incompatible version')
    }
    return validateAndCloneAppRefreshPreferences(parsed)
  } catch (error) {
    backupCorruptedData(result.value)
    persistRecovery(fallback)
    console.warn('App refresh preferences were invalid and have been reset.', error)
    return fallback
  }
}

function persistRecovery(preferences: AppRefreshPreferences): void {
  try {
    saveAppRefreshPreferences(preferences)
  } catch {
    // Keep the in-memory fallback when storage is unavailable or full.
  }
}

function backupCorruptedData(raw: string): void {
  browserStorageAdapter.write(`${corruptAppSettingsStorageKeyPrefix}${Date.now()}`, raw)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
