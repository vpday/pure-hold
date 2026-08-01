---
name: presenters
description: 'Skill for the Presenters area of pure-hold. 54 symbols across 16 files.'
---

# Presenters

54 symbols | 16 files | Cohesion: 98%

## When to Use

- Working with code in `src/`
- Understanding how toFundDetailViewModel, viewModel, formatEstimatedDisplayDate work
- Modifying presenters-related functionality

## Key Files

| File                                                                           | Symbols                                                                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/features/fund-detail/presenters/toFundDetailViewModel.ts`                 | toFundDetailViewModel, formatNumber, formatPercent, formatRisk, formatNetAssets (+10)               |
| `src/features/fund-list/FundListSection.vue`                                   | latestEstimatedAt, latestNavDate, latestText, rows, categories (+1)                                 |
| `src/features/index-overview/presenters/toIndexOverviewViewModel.ts`           | toIndexOverviewViewModel, toIndexQuoteViewModel, formatSignedNumber, toTrend, formatShanghaiTime    |
| `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts`          | formatter, formatTooltip, formatNetValue, formatGrowth, toNullableFiniteNumber                      |
| `src/features/fund-detail/presenters/buildFundCumulativeReturnsChartOption.ts` | buildFundCumulativeReturnsChartOption, buildFundDrawdownOverlay, formatTooltip, formatSignedPercent |
| `src/features/fund-list/presenters/toFundListViewModel.ts`                     | toFundListViewModel, formatNumber, formatPercent, toTrend                                           |
| `src/features/fund-list/presenters/formatFundDates.ts`                         | formatEstimatedDisplayDate, formatNavDisplayDate, parseFundDate                                     |
| `src/features/fund-detail/presenters/toFundCumulativeReturnsChartModel.ts`     | toFundCumulativeReturnsChartModel, formatPercent                                                    |
| `src/features/fund-detail/components/FundCumulativeReturnsChart.vue`           | render, themeColor                                                                                  |
| `src/features/fund-list/presenters/sortFundSnapshots.ts`                       | sortFundSnapshots, sortableValue                                                                    |

## Entry Points

Start here when exploring this area:

- **`toFundDetailViewModel`** (Function) — `src/features/fund-detail/presenters/toFundDetailViewModel.ts:14`
- **`viewModel`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:26`
- **`formatEstimatedDisplayDate`** (Function) — `src/features/fund-list/presenters/formatFundDates.ts:0`
- **`formatNavDisplayDate`** (Function) — `src/features/fund-list/presenters/formatFundDates.ts:18`
- **`parseFundDate`** (Function) — `src/features/fund-list/presenters/formatFundDates.ts:23`

## Key Symbols

| Symbol                                  | Type     | File                                                                           | Line |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------ | ---- |
| `toFundDetailViewModel`                 | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`                 | 14   |
| `viewModel`                             | Function | `src/features/fund-detail/FundDetailEntry.vue`                                 | 26   |
| `formatEstimatedDisplayDate`            | Function | `src/features/fund-list/presenters/formatFundDates.ts`                         | 0    |
| `formatNavDisplayDate`                  | Function | `src/features/fund-list/presenters/formatFundDates.ts`                         | 18   |
| `parseFundDate`                         | Function | `src/features/fund-list/presenters/formatFundDates.ts`                         | 23   |
| `latestEstimatedAt`                     | Function | `src/features/fund-list/FundListSection.vue`                                   | 54   |
| `latestNavDate`                         | Function | `src/features/fund-list/FundListSection.vue`                                   | 57   |
| `latestText`                            | Function | `src/features/fund-list/FundListSection.vue`                                   | 108  |
| `toIndexOverviewViewModel`              | Function | `src/features/index-overview/presenters/toIndexOverviewViewModel.ts`           | 17   |
| `viewModel`                             | Function | `src/features/index-overview/IndexOverviewSection.vue`                         | 19   |
| `formatter`                             | Function | `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts`          | 44   |
| `analyzeFundDrawdown`                   | Function | `src/domains/funds/models/fundDrawdown.ts`                                     | 8    |
| `cumulativeReturnsChart`                | Function | `src/features/fund-detail/composables/useFundPerformance.ts`                   | 42   |
| `toFundCumulativeReturnsChartModel`     | Function | `src/features/fund-detail/presenters/toFundCumulativeReturnsChartModel.ts`     | 4    |
| `buildFundCumulativeReturnsChartOption` | Function | `src/features/fund-detail/presenters/buildFundCumulativeReturnsChartOption.ts` | 32   |
| `render`                                | Function | `src/features/fund-detail/components/FundCumulativeReturnsChart.vue`           | 41   |
| `themeColor`                            | Function | `src/features/fund-detail/components/FundCumulativeReturnsChart.vue`           | 58   |
| `toFundListViewModel`                   | Function | `src/features/fund-list/presenters/toFundListViewModel.ts`                     | 16   |
| `sortFundSnapshots`                     | Function | `src/features/fund-list/presenters/sortFundSnapshots.ts`                       | 3    |
| `rows`                                  | Function | `src/features/fund-list/FundListSection.vue`                                   | 51   |

## Execution Flows

| Flow                                | Type            | Steps |
| ----------------------------------- | --------------- | ----- |
| `LatestEstimatedAt → ParseFundDate` | intra_community | 3     |
| `LatestNavDate → ParseFundDate`     | intra_community | 3     |

## How to Explore

1. `context({name: "toFundDetailViewModel"})` — see callers and callees
2. `query({search_query: "presenters"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
