import { holdingTotalCostCents, type FundHolding } from './fundHolding.ts'
import type { FundMarketData } from './fundMarketData.ts'

export type FundCurrentIncomeSource = 'actual' | 'estimated' | 'none'

export interface FundHoldingMetrics {
  readonly confirmedNavDate: string | null
  readonly currentIncomeSource: FundCurrentIncomeSource
  readonly estimatedIncome: number | null
  readonly estimatedIncomePercent: number | null
  readonly holdingAmount: number | null
  readonly holdingDays: number | null
  readonly holdingIncome: number | null
  readonly holdingIncomePercent: number | null
  readonly todayIncome: number | null
  readonly todayIncomePercent: number | null
  readonly yesterdayIncome: number | null
  readonly yesterdayIncomeDate: string | null
  readonly yesterdayIncomePercent: number | null
}

export interface CalculateFundHoldingMetricsInput {
  readonly currentMarketData: FundMarketData
  readonly holding: FundHolding
  readonly previousConfirmedMarketData?: FundMarketData
  readonly today: string
}

export function calculateFundHoldingMetrics({
  currentMarketData,
  holding,
  previousConfirmedMarketData,
  today,
}: CalculateFundHoldingMetricsInput): FundHoldingMetrics {
  const nav = positiveFiniteNumber(currentMarketData.nav)
  const units = positiveFiniteNumber(holding.units)
  const totalCostCents = holdingTotalCostCents(holding)
  const totalCost = positiveFiniteNumber(totalCostCents === null ? null : totalCostCents / 100)
  const hasCurrentNav = nav !== null && currentMarketData.navDate === today
  const estimatedNav = positiveFiniteNumber(currentMarketData.estimatedNav)
  const currentEstimateNav =
    !hasCurrentNav &&
    nav !== null &&
    estimatedNav !== null &&
    fundDate(currentMarketData.estimatedAt) === today
      ? estimatedNav
      : null
  const estimatedIncomePercent =
    currentEstimateNav !== null && nav !== null
      ? (finiteNumber(currentMarketData.estimatedChangePercent) ??
        (currentEstimateNav / nav - 1) * 100)
      : null
  const todayIncomePercent = hasCurrentNav
    ? finiteNumber(currentMarketData.dailyChangePercent)
    : null
  const todayIncome =
    nav !== null && units !== null ? incomeFromChangePercent(nav, units, todayIncomePercent) : null
  const yesterdayMarketData = hasCurrentNav ? previousConfirmedMarketData : currentMarketData
  const yesterdayNav = positiveFiniteNumber(yesterdayMarketData?.nav ?? null)
  const yesterdayIncomePercent = finiteNumber(yesterdayMarketData?.dailyChangePercent ?? null)
  const hasYesterdayIncome =
    yesterdayNav !== null &&
    units !== null &&
    yesterdayMarketData?.navDate !== null &&
    yesterdayMarketData?.navDate !== undefined &&
    yesterdayMarketData.navDate < today

  return {
    confirmedNavDate: nav === null ? null : currentMarketData.navDate,
    currentIncomeSource: hasCurrentNav
      ? 'actual'
      : currentEstimateNav !== null
        ? 'estimated'
        : 'none',
    estimatedIncome:
      currentEstimateNav !== null && nav !== null && units !== null
        ? (currentEstimateNav - nav) * units
        : null,
    estimatedIncomePercent,
    holdingAmount: nav !== null && units !== null ? nav * units : null,
    holdingDays: calendarDayDifference(holding.purchaseDate, today),
    holdingIncome:
      nav !== null && units !== null && totalCost !== null ? nav * units - totalCost : null,
    holdingIncomePercent:
      nav !== null && units !== null && totalCost !== null && totalCost > 0
        ? ((nav * units - totalCost) / totalCost) * 100
        : null,
    todayIncome,
    todayIncomePercent,
    yesterdayIncome: hasYesterdayIncome
      ? incomeFromChangePercent(yesterdayNav, units, yesterdayIncomePercent)
      : null,
    yesterdayIncomeDate: hasYesterdayIncome ? yesterdayMarketData.navDate : null,
    yesterdayIncomePercent: hasYesterdayIncome ? yesterdayIncomePercent : null,
  }
}

function incomeFromChangePercent(
  nav: number,
  units: number,
  changePercent: number | null,
): number | null {
  if (changePercent === null) return null
  const denominator = 1 + changePercent / 100
  if (!Number.isFinite(denominator) || denominator === 0) return null
  const previousNav = nav / denominator
  const income = (nav - previousNav) * units
  return Number.isFinite(income) ? income : null
}

function calendarDayDifference(start: string, end: string): number | null {
  const startTime = isoDateToUtcTime(start)
  const endTime = isoDateToUtcTime(end)
  if (startTime === null || endTime === null || startTime > endTime) return null
  return (endTime - startTime) / 86_400_000
}

function isoDateToUtcTime(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const date = new Date(time)
  return date.toISOString().slice(0, 10) === value ? time : null
}

function fundDate(value: string | null): string | null {
  if (value === null) return null
  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(value)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}

function finiteNumber(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null
}

function positiveFiniteNumber(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null
}
