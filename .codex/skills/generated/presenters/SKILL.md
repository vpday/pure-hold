---
name: presenters
description: "Skill for the Presenters area of pure-hold. 124 symbols across 42 files."
---

# Presenters

124 symbols | 42 files | Cohesion: 94%

## When to Use

- Working with code in `src/`
- Understanding how analyzeFundDrawdown, createFundPerformancePanelAdapters, useFundCumulativeExcessReturn work
- Modifying presenters-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/features/fund-detail/presenters/toFundDetailViewModel.ts` | toFundDetailViewModel, formatNumber, formatPercent, formatRisk, formatNetAssets (+9) |
| `src/features/fund-detail/presenters/toFundMetricsSectionModel.ts` | toFundMetricsSectionModel, metricsAlerts, benchmarkIssueCount, comparisonRow, metricValue (+5) |
| `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts` | formatter, formatTooltip, formatNetValue, formatGrowth, toNullableFiniteNumber (+4) |
| `src/features/fund-detail/presenters/toFundHoldingsSectionModel.ts` | toFundHoldingsSectionModel, sumPercent, formatHoldingChange, holdingChangeTrend, formatPercent (+3) |
| `src/features/fund-list/presenters/toFundListViewModel.ts` | toFundListViewModel, toHoldingViewModel, toIncomeViewModel, formatNumber, formatPercent (+2) |
| `src/features/fund-list/FundListSection.vue` | latestEstimatedAt, latestNavDate, latestText, rows, categories (+1) |
| `src/features/fund-detail/presenters/buildFundAssetAllocationChartOption.ts` | formatter, formatTooltip, toNullableFiniteNumber, max, percentAxisMaximum (+1) |
| `src/features/index-overview/presenters/toIndexOverviewViewModel.ts` | toIndexOverviewViewModel, toIndexQuoteViewModel, formatSignedNumber, toTrend, formatShanghaiTime |
| `src/features/fund-detail/presenters/buildFundRollingExcessReturnChartOption.ts` | formatter, formatTooltip, tooltipRow, formatSignedPercent |
| `src/features/fund-detail/presenters/toFundMetricsSectionModel.test.ts` | comparison, value, riskComparison, riskValue |

## Entry Points

Start here when exploring this area:

- **`analyzeFundDrawdown`** (Function) — `src/domains/funds/models/fundDrawdown.ts:8`
- **`createFundPerformancePanelAdapters`** (Function) — `src/features/fund-detail/composables/createFundPerformancePanelAdapters.ts:85`
- **`useFundCumulativeExcessReturn`** (Function) — `src/features/fund-detail/composables/useFundCumulativeExcessReturn.ts:21`
- **`useFundCumulativeReturns`** (Function) — `src/features/fund-detail/composables/useFundCumulativeReturns.ts:13`
- **`useFundDrawdownComparison`** (Function) — `src/features/fund-detail/composables/useFundDrawdownComparison.ts:21`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `analyzeFundDrawdown` | Function | `src/domains/funds/models/fundDrawdown.ts` | 8 |
| `createFundPerformancePanelAdapters` | Function | `src/features/fund-detail/composables/createFundPerformancePanelAdapters.ts` | 85 |
| `useFundCumulativeExcessReturn` | Function | `src/features/fund-detail/composables/useFundCumulativeExcessReturn.ts` | 21 |
| `useFundCumulativeReturns` | Function | `src/features/fund-detail/composables/useFundCumulativeReturns.ts` | 13 |
| `useFundDrawdownComparison` | Function | `src/features/fund-detail/composables/useFundDrawdownComparison.ts` | 21 |
| `useFundReinvestedNavHistory` | Function | `src/features/fund-detail/composables/useFundReinvestedNavHistory.ts` | 11 |
| `useFundRollingExcessReturn` | Function | `src/features/fund-detail/composables/useFundRollingExcessReturn.ts` | 21 |
| `toFundCumulativeExcessReturnChartModel` | Function | `src/features/fund-detail/presenters/toFundCumulativeExcessReturnChartModel.ts` | 6 |
| `toFundCumulativeReturnsChartModel` | Function | `src/features/fund-detail/presenters/toFundCumulativeReturnsChartModel.ts` | 4 |
| `toFundDistributionTableModel` | Function | `src/features/fund-detail/presenters/toFundDistributionTableModel.ts` | 4 |
| `toFundDrawdownComparisonChartModel` | Function | `src/features/fund-detail/presenters/toFundDrawdownComparisonChartModel.ts` | 3 |
| `toFundNetValueChartModel` | Function | `src/features/fund-detail/presenters/toFundNetValueChartModel.ts` | 3 |
| `toFundReinvestedNavChartModel` | Function | `src/features/fund-detail/presenters/toFundReinvestedNavChartModel.ts` | 11 |
| `toFundRollingExcessReturnChartModel` | Function | `src/features/fund-detail/presenters/toFundRollingExcessReturnChartModel.ts` | 6 |
| `model` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 71 |
| `toFundAssetAllocationChartModel` | Function | `src/features/fund-detail/presenters/toFundAssetAllocationChartModel.ts` | 3 |
| `toFundHoldingsSectionModel` | Function | `src/features/fund-detail/presenters/toFundHoldingsSectionModel.ts` | 26 |
| `createTestFundSnapshot` | Function | `src/domains/funds/testing/createTestFundSnapshot.ts` | 2 |
| `toFundListViewModel` | Function | `src/features/fund-list/presenters/toFundListViewModel.ts` | 24 |
| `viewModel` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 36 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `BaseRows → FormatSignedNumber` | cross_community | 5 |
| `BaseRows → FormatPercent` | cross_community | 5 |
| `BaseRows → ToTrend` | cross_community | 5 |
| `UseFundPerformance → CancelActiveRequest` | cross_community | 5 |
| `UseFundPerformance → CancelActiveRequest` | cross_community | 5 |
| `UseFundPerformance → ResetState` | cross_community | 5 |
| `SyncChart → EventName` | cross_community | 5 |
| `BaseRows → FormatNumber` | cross_community | 4 |
| `Model → FormatNumber` | intra_community | 4 |
| `UseFundPerformance → UseFundHistoryDataSource` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Composables | 2 calls |
| Components | 1 calls |

## How to Explore

1. `context({name: "analyzeFundDrawdown"})` — see callers and callees
2. `query({search_query: "presenters"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
