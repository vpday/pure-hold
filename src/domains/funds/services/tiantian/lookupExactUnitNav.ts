import type { FundNetValueHistory } from '../../models/fundNetValueHistory.ts'
import { fetchTiantianFundNetValueHistory } from './fetchTiantianFundNetValueHistory.ts'

export interface FundValue {
  readonly date: string
  readonly source: 'nav-history'
  readonly unitNav: number
}

export async function lookupExactUnitNav(
  fundCode: string,
  date: string,
  signal?: AbortSignal,
): Promise<FundValue | null> {
  const history = await fetchTiantianFundNetValueHistory(fundCode, 'ln', signal)
  return toFundValue(history, date)
}

function toFundValue(history: FundNetValueHistory, date: string): FundValue | null {
  const point = history.points.find(
    (candidate) =>
      candidate.date === date &&
      candidate.unitNetValue !== null &&
      Number.isFinite(candidate.unitNetValue) &&
      candidate.unitNetValue > 0,
  )
  if (!point || point.unitNetValue === null) return null
  return { date: point.date, source: 'nav-history', unitNav: point.unitNetValue }
}
