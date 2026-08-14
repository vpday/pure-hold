import type { Portfolio } from '../../models/index.ts'
import { loadPortfolio } from './loadPortfolio.ts'
import { savePortfolio } from './savePortfolio.ts'

export interface PortfolioPersistence {
  readonly load: () => Portfolio
  readonly save: (portfolio: Portfolio) => void
}

export function createPortfolioPersistence(): PortfolioPersistence {
  return { load: loadPortfolio, save: savePortfolio }
}
