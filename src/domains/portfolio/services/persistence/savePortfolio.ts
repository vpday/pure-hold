import type { Portfolio } from '../../models/index.ts'
import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'
import { PORTFOLIO_SCHEMA_VERSION, portfolioStorageKey } from './portfolioSchemaVersion.ts'
import { validateAndClonePortfolio } from './validatePortfolioPersistence.ts'

export function savePortfolio(portfolio: Portfolio): void {
  const validated = validateAndClonePortfolio(portfolio)
  const result = browserStorageAdapter.write(
    portfolioStorageKey,
    JSON.stringify({ ...validated, version: PORTFOLIO_SCHEMA_VERSION }),
  )
  if (!result.ok) throw result.error
}
