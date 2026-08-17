import { createPortfolioStore, type PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { createPortfolioPersistence } from '@/domains/portfolio/services/persistence/index.ts'

export function createPortfolioRuntime(): PortfolioStore {
  const persistence = createPortfolioPersistence()
  return createPortfolioStore(persistence.load(), persistence.save)
}
