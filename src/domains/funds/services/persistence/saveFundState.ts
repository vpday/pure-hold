import type { FundState } from '../../models/fundState.ts'
import { FUND_STATE_SCHEMA_VERSION, fundStateStorageKey } from './fundStateSchemaVersion.ts'
import { validateAndCloneFundState } from './validateFundState.ts'

export function saveFundState(state: FundState): void {
  const validated = validateAndCloneFundState(state)
  const storage = getLocalStorage()
  if (!storage) {
    throw new Error('localStorage is unavailable')
  }

  storage.setItem(
    fundStateStorageKey,
    JSON.stringify({ ...validated, version: FUND_STATE_SCHEMA_VERSION }),
  )
}

function getLocalStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}
