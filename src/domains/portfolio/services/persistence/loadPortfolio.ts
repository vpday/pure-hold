import type { Portfolio } from '../../models/index.ts'
import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import {
  corruptPortfolioStorageKeyPrefix,
  PORTFOLIO_SCHEMA_VERSION,
  portfolioStorageKey,
} from './portfolioSchemaVersion.ts'
import { savePortfolio } from './savePortfolio.ts'
import { validateAndClonePortfolio } from './validatePortfolioPersistence.ts'

export function loadPortfolio(): Portfolio {
  const fallback = createEmptyPortfolio()
  browserStorageAdapter.requestPersistence()
  const result = browserStorageAdapter.read(portfolioStorageKey)
  if (result.status !== 'found') return fallback

  try {
    const parsed: unknown = JSON.parse(result.value)
    if (!isRecord(parsed) || parsed.version !== PORTFOLIO_SCHEMA_VERSION) {
      throw new TypeError('Persisted portfolio has an incompatible version')
    }
    const { version: _version, ...facts } = parsed
    return validateAndClonePortfolio(facts)
  } catch (error) {
    backupCorruptedData(result.value)
    persistRecovery(fallback)
    console.warn('Portfolio data was invalid and has been reset.', error)
    return fallback
  }
}

export function createEmptyPortfolio(): Portfolio {
  return { events: [], fundCodes: [] }
}

function persistRecovery(portfolio: Portfolio): void {
  try {
    savePortfolio(portfolio)
  } catch {
    // Keep the in-memory fallback when storage is unavailable or full.
  }
}

function backupCorruptedData(raw: string): void {
  browserStorageAdapter.write(`${corruptPortfolioStorageKeyPrefix}${Date.now()}`, raw)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
