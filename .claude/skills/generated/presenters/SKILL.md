---
name: presenters
description: 'Skill for the Presenters area of pure-hold. 40 symbols across 12 files.'
---

# Presenters

40 symbols | 12 files | Cohesion: 98%

## When to Use

- Working with code in `src/`
- Understanding how viewModel, toFundDetailViewModel, viewModel work
- Modifying presenters-related functionality

## Key Files

| File                                                                           | Symbols                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `src/features/fund-detail/presenters/toFundDetailViewModel.ts`                 | toFundDetailViewModel, formatNumber, formatPercent, formatRisk, formatNetAssets (+10)            |
| `src/features/index-overview/presenters/toIndexOverviewViewModel.ts`           | toIndexOverviewViewModel, toIndexQuoteViewModel, formatSignedNumber, toTrend, formatShanghaiTime |
| `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts`          | formatter, formatTooltip, formatNetValue, formatGrowth, toNullableFiniteNumber                   |
| `src/features/fund-list/presenters/toFundListViewModel.ts`                     | toFundListViewModel, formatNumber, formatPercent, toTrend                                        |
| `src/features/fund-detail/presenters/toFundCumulativeReturnsChartModel.ts`     | toFundCumulativeReturnsChartModel, formatPercent                                                 |
| `src/features/fund-list/presenters/sortFundSnapshots.ts`                       | sortFundSnapshots, sortableValue                                                                 |
| `src/features/fund-detail/presenters/buildFundCumulativeReturnsChartOption.ts` | formatTooltip, formatSignedPercent                                                               |
| `src/features/fund-detail/FundDetailEntry.vue`                                 | viewModel                                                                                        |
| `src/features/index-overview/IndexOverviewSection.vue`                         | viewModel                                                                                        |
| `src/domains/funds/models/fundDrawdown.ts`                                     | analyzeFundDrawdown                                                                              |

## Entry Points

Start here when exploring this area:

- **`viewModel`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:26`
- **`toFundDetailViewModel`** (Function) — `src/features/fund-detail/presenters/toFundDetailViewModel.ts:14`
- **`viewModel`** (Function) — `src/features/index-overview/IndexOverviewSection.vue:19`
- **`toIndexOverviewViewModel`** (Function) — `src/features/index-overview/presenters/toIndexOverviewViewModel.ts:17`
- **`formatter`** (Function) — `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts:44`

## Key Symbols

| Symbol                              | Type     | File                                                                       | Line |
| ----------------------------------- | -------- | -------------------------------------------------------------------------- | ---- |
| `viewModel`                         | Function | `src/features/fund-detail/FundDetailEntry.vue`                             | 26   |
| `toFundDetailViewModel`             | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 14   |
| `viewModel`                         | Function | `src/features/index-overview/IndexOverviewSection.vue`                     | 19   |
| `toIndexOverviewViewModel`          | Function | `src/features/index-overview/presenters/toIndexOverviewViewModel.ts`       | 17   |
| `formatter`                         | Function | `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts`      | 44   |
| `analyzeFundDrawdown`               | Function | `src/domains/funds/models/fundDrawdown.ts`                                 | 8    |
| `cumulativeReturnsChart`            | Function | `src/features/fund-detail/composables/useFundPerformance.ts`               | 42   |
| `toFundCumulativeReturnsChartModel` | Function | `src/features/fund-detail/presenters/toFundCumulativeReturnsChartModel.ts` | 4    |
| `toFundListViewModel`               | Function | `src/features/fund-list/presenters/toFundListViewModel.ts`                 | 16   |
| `rows`                              | Function | `src/features/fund-list/FundListSection.vue`                               | 51   |
| `sortFundSnapshots`                 | Function | `src/features/fund-list/presenters/sortFundSnapshots.ts`                   | 3    |
| `formatNumber`                      | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 112  |
| `formatPercent`                     | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 116  |
| `formatRisk`                        | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 122  |
| `formatNetAssets`                   | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 129  |
| `formatCompactDate`                 | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 133  |
| `formatFullDate`                    | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 138  |
| `toTrend`                           | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 142  |
| `toTradingRulesViewModel`           | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 41   |
| `formatAmount`                      | Function | `src/features/fund-detail/presenters/toFundDetailViewModel.ts`             | 78   |

## Execution Flows

| Flow                             | Type            | Steps |
| -------------------------------- | --------------- | ----- |
| `ViewModel → FormatSignedNumber` | intra_community | 4     |
| `ViewModel → ToTrend`            | intra_community | 4     |

## How to Explore

1. `context({name: "viewModel"})` — see callers and callees
2. `query({search_query: "presenters"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
