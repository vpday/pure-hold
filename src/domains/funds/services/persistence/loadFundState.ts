import type { FundState } from '../../models/fundState.ts'
import {
  FUND_STATE_SCHEMA_VERSION,
  corruptFundStateStorageKeyPrefix,
  fundStateStorageKey,
} from './fundStateSchemaVersion.ts'
import { saveFundState } from './saveFundState.ts'
import { validateAndCloneFundState } from './validateFundState.ts'

export function loadFundState(): FundState {
  const fallback = createEmptyFundState()
  const storage = getLocalStorage()
  if (!storage) {
    return fallback
  }

  requestPersistentStorage()

  let raw: string | null
  try {
    raw = storage.getItem(fundStateStorageKey)
  } catch {
    return fallback
  }

  if (raw === null) {
    return fallback
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== FUND_STATE_SCHEMA_VERSION) {
      throw new TypeError('Persisted fund state has an incompatible version')
    }
    const state = validateAndCloneFundState(parsed, true)
    if (
      JSON.stringify(state.groups) !== JSON.stringify(parsed.groups) ||
      JSON.stringify(state.holdingOrder) !== JSON.stringify(parsed.holdingOrder) ||
      JSON.stringify(state.holdingsByCode) !== JSON.stringify(parsed.holdingsByCode)
    ) {
      saveFundState(state)
    }
    return state
  } catch (error) {
    backupCorruptedData(storage, raw)
    persistRecovery(fallback)
    console.warn('Fund state was invalid and has been reset.', error)
    return fallback
  }
}

function createEmptyFundState(): FundState {
  return { fundOrder: [], groups: [], holdingOrder: [], holdingsByCode: {}, snapshotsByCode: {} }
}

function persistRecovery(state: FundState): void {
  try {
    saveFundState(state)
  } catch {
    // Keep the in-memory fallback when storage is unavailable or full.
  }
}

function backupCorruptedData(storage: Storage, raw: string): void {
  try {
    storage.setItem(`${corruptFundStateStorageKeyPrefix}${Date.now()}`, raw)
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
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
