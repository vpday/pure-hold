import type { FundRiskPeriodKey } from '@/domains/funds/models/fundRiskMetrics.ts'

export type FundMetricsView = 'annualized' | 'calendar' | 'periods' | 'risk'
export type FundMetricTrend = 'down' | 'flat' | 'unknown' | 'up'

export interface FundMetricsAlertModel {
  readonly key: string
  readonly message: string
  readonly tone: 'info' | 'warning'
}

export interface FundMetricValueModel {
  readonly text: string
  readonly trend: FundMetricTrend
}

export interface FundMetricComparisonRowModel {
  readonly benchmark: FundMetricValueModel
  readonly excess: FundMetricValueModel
  readonly fund: FundMetricValueModel
  readonly key: string
  readonly label: string
}

export interface FundRiskComparisonRowModel {
  readonly benchmark: FundMetricValueModel
  readonly difference: FundMetricValueModel
  readonly fund: FundMetricValueModel
  readonly key: string
  readonly label: string
}

export interface FundRiskPeriodModel {
  readonly alert: FundMetricsAlertModel | null
  readonly key: FundRiskPeriodKey
  readonly label: string
  readonly rows: readonly FundRiskComparisonRowModel[]
}

export interface FundRiskSectionModel {
  readonly parameterError: string
  readonly periods: readonly FundRiskPeriodModel[]
  readonly riskFreeRatePercent: number | null
  readonly targetRatePercent: number | null
}

export interface FundMetricsSectionModel {
  readonly alerts: readonly FundMetricsAlertModel[]
  readonly annualized: readonly FundMetricComparisonRowModel[]
  readonly annualReturns: readonly FundMetricComparisonRowModel[]
  readonly cutoffText: string
  readonly periods: readonly FundMetricComparisonRowModel[]
  readonly quarterlyReturns: readonly FundMetricComparisonRowModel[]
  readonly risk?: FundRiskSectionModel
}
