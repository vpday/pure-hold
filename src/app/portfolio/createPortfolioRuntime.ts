import { createPortfolioStore, type PortfolioStore } from '@/domains/portfolio/stores/index.ts'
import { createPortfolioPersistence } from '@/domains/portfolio/services/persistence/index.ts'
import { syncLocalDraftPlans } from '@/domains/portfolio/services/portfolioPlanService.ts'

export function createPortfolioRuntime(): PortfolioStore {
  const persistence = createPortfolioPersistence()
  const store = createPortfolioStore(persistence.load(), persistence.save)
  syncLocalDraftPlans(store, shanghaiDate(), new Date().toISOString())
  return store
}

function shanghaiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
