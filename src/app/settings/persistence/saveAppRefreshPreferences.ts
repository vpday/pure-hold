import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import { cloneAppRefreshPreferences } from '../models/appRefreshPreferences.ts'
import type { AppRefreshPreferences } from '../models/appRefreshPreferences.ts'
import { APP_SETTINGS_SCHEMA_VERSION, appSettingsStorageKey } from './appSettingsSchemaVersion.ts'
import { validateAndCloneAppRefreshPreferences } from './validateAppRefreshPreferences.ts'

export function saveAppRefreshPreferences(preferences: AppRefreshPreferences): void {
  const validated = validateAndCloneAppRefreshPreferences(preferences)
  const result = browserStorageAdapter.write(
    appSettingsStorageKey,
    JSON.stringify({
      ...cloneAppRefreshPreferences(validated),
      version: APP_SETTINGS_SCHEMA_VERSION,
    }),
  )
  if (!result.ok) {
    throw result.error
  }
}
