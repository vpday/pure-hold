import type { FundHoldingMetrics, FundCurrentIncomeSource } from './fundHoldingMetrics.ts'
import { holdingTotalCostCents, type FundHolding } from './fundHolding.ts'
import type { FundSnapshot } from './fundSnapshot.ts'

export type FundHoldingStatisticsIncomeSource = FundCurrentIncomeSource | 'mixed'

export interface FundHoldingStatisticsItem {
  readonly currentSnapshot: FundSnapshot
  readonly holding: FundHolding
  readonly metrics: FundHoldingMetrics
  readonly previousConfirmedSnapshot?: FundSnapshot
  readonly today: string
}

export interface FundHoldingStatistics {
  readonly currentIncome: number | null
  readonly currentIncomePercent: number | null
  readonly currentIncomeSource: FundHoldingStatisticsIncomeSource
  readonly holdingAmount: number | null
  readonly holdingIncome: number | null
  readonly holdingIncomePercent: number | null
  readonly yesterdayIncome: number | null
  readonly yesterdayIncomePercent: number | null
}

export function calculateFundHoldingStatistics(
  items: readonly FundHoldingStatisticsItem[],
): FundHoldingStatistics {
  const holdingAmounts: number[] = []
  const currentIncomeAmounts: number[] = []
  const currentIncomePairs: IncomePair[] = []
  const currentIncomeSources = new Set<FundCurrentIncomeSource>()
  const yesterdayIncomeAmounts: number[] = []
  const yesterdayIncomePairs: IncomePair[] = []
  const holdingIncomeAmounts: number[] = []
  const holdingIncomePairs: IncomePair[] = []

  for (const item of items) {
    const { holding, metrics } = item
    addValue(holdingAmounts, metrics.holdingAmount)

    const currentIncome = currentIncomePair(item)
    if (currentIncome) {
      currentIncomeAmounts.push(currentIncome.amount)
      currentIncomePairs.push(currentIncome)
      if (currentIncome.source) currentIncomeSources.add(currentIncome.source)
    }

    const yesterdayIncome = yesterdayIncomePair(item)
    if (yesterdayIncome) {
      yesterdayIncomeAmounts.push(yesterdayIncome.amount)
      yesterdayIncomePairs.push(yesterdayIncome)
    }

    const totalCostCents = holdingTotalCostCents(holding)
    const costAmount = positiveFiniteNumber(totalCostCents === null ? null : totalCostCents / 100)
    if (metrics.holdingIncome !== null && costAmount !== null) {
      holdingIncomeAmounts.push(metrics.holdingIncome)
      holdingIncomePairs.push({ amount: metrics.holdingIncome, base: costAmount })
    }
  }

  return {
    currentIncome: sumValues(currentIncomeAmounts),
    currentIncomePercent: rateFromPairs(currentIncomePairs),
    currentIncomeSource: incomeSourceFromSet(currentIncomeSources),
    holdingAmount: sumValues(holdingAmounts),
    holdingIncome: sumValues(holdingIncomeAmounts),
    holdingIncomePercent: rateFromPairs(holdingIncomePairs),
    yesterdayIncome: sumValues(yesterdayIncomeAmounts),
    yesterdayIncomePercent: rateFromPairs(yesterdayIncomePairs),
  }
}

interface IncomePair {
  readonly amount: number
  readonly base: number
  readonly source?: FundCurrentIncomeSource
}

function currentIncomePair(item: FundHoldingStatisticsItem): IncomePair | null {
  const { holding, metrics } = item
  if (metrics.currentIncomeSource === 'actual' && metrics.todayIncome !== null) {
    const base = incomeBaseAmount(
      item.currentSnapshot.nav,
      holding.units,
      metrics.todayIncomePercent,
    )
    return base === null ? null : { amount: metrics.todayIncome, base, source: 'actual' }
  }
  if (metrics.currentIncomeSource === 'estimated' && metrics.estimatedIncome !== null) {
    const base = positiveFiniteNumber(metrics.holdingAmount ?? 0)
    return base === null ? null : { amount: metrics.estimatedIncome, base, source: 'estimated' }
  }
  return null
}

function yesterdayIncomePair(item: FundHoldingStatisticsItem): IncomePair | null {
  const { holding, metrics } = item
  if (metrics.yesterdayIncome === null) return null

  const snapshot = hasCurrentConfirmedNav(item)
    ? item.previousConfirmedSnapshot
    : item.currentSnapshot
  if (!snapshot) return null

  const base = incomeBaseAmount(snapshot.nav, holding.units, metrics.yesterdayIncomePercent)
  return base === null ? null : { amount: metrics.yesterdayIncome, base }
}

function hasCurrentConfirmedNav(item: FundHoldingStatisticsItem): boolean {
  return item.metrics.confirmedNavDate === item.today
}

function incomeBaseAmount(
  nav: number | null,
  units: number,
  changePercent: number | null,
): number | null {
  const validNav = positiveFiniteNumber(nav)
  const validUnits = positiveFiniteNumber(units)
  const validChangePercent = finiteNumber(changePercent)
  if (validNav === null || validUnits === null || validChangePercent === null) return null

  const denominator = 1 + validChangePercent / 100
  if (!Number.isFinite(denominator) || denominator <= 0) return null

  const base = (validNav / denominator) * validUnits
  return positiveFiniteNumber(base)
}

function rateFromPairs(pairs: readonly IncomePair[]): number | null {
  if (pairs.length === 0) return null
  const income = pairs.reduce((total, pair) => total + pair.amount, 0)
  const base = pairs.reduce((total, pair) => total + pair.base, 0)
  if (!Number.isFinite(income) || !Number.isFinite(base) || base <= 0) return null
  return (income / base) * 100
}

function sumValues(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number.isFinite(total) ? total : null
}

function addValue(values: number[], value: number | null): void {
  if (value !== null && Number.isFinite(value)) values.push(value)
}

function incomeSourceFromSet(
  sources: ReadonlySet<FundCurrentIncomeSource>,
): FundHoldingStatisticsIncomeSource {
  if (sources.size === 0) return 'none'
  if (sources.size === 1) return sources.values().next().value!
  return 'mixed'
}

function finiteNumber(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null
}

function positiveFiniteNumber(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null
}
