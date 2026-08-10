import type { FundSettings } from '../../models/fundSettings.ts'
import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import {
  FUND_SETTINGS_SCHEMA_VERSION,
  fundSettingsStorageKey,
} from './fundSettingsSchemaVersion.ts'
import { validateAndCloneFundSettings } from './validateFundSettings.ts'

export function saveFundSettings(settings: FundSettings): void {
  const validated = validateAndCloneFundSettings(settings)
  const result = browserStorageAdapter.write(
    fundSettingsStorageKey,
    JSON.stringify({ ...validated, version: FUND_SETTINGS_SCHEMA_VERSION }),
  )
  if (!result.ok) {
    throw result.error
  }
}
