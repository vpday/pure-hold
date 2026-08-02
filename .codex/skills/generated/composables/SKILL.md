---
name: composables
description: 'Skill for the Composables area of pure-hold. 195 symbols across 35 files.'
---

# Composables

195 symbols | 35 files | Cohesion: 95%

## When to Use

- Working with code in `src/`
- Understanding how activate, selectRange, retry work
- Modifying composables-related functionality

## Key Files

| File                                                                 | Symbols                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/features/fund-detail/composables/useFundNetValueHistory.ts`     | activate, selectRange, retry, refresh, request (+11)                                                   |
| `src/features/index-settings/composables/useIndexSettingsSession.ts` | selectGroup, addGroup, renameGroup, replaceGroups, saveGroups (+9)                                     |
| `src/features/fund-detail/composables/useFundCumulativeReturns.ts`   | useFundCumulativeReturns, selectReferenceIndex, selectRange, retry, refresh (+8)                       |
| `src/features/fund-detail/composables/useFundMetrics.ts`             | loadBatch, isCurrent, noticesForSuccessfulBatch, isBenchmarkLoadFailure, isAbortError (+7)             |
| `src/features/fund-detail/composables/useFundDistribution.ts`        | useFundDistribution, initialize, close, cancelActiveRequest, activate (+7)                             |
| `src/features/fund-detail/composables/useFundHistoryDataSource.ts`   | useFundHistoryDataSource, loadDistribution, loadNetValueHistory, request, loadDistributionHistory (+6) |
| `src/features/fund-search/composables/useFundSearch.ts`              | setKeyword, loadMore, retry, reset, requestPage (+6)                                                   |
| `src/features/index-overview/composables/useQuoteCarousel.ts`        | useQuoteCarousel, handleTransitionEnd, resetLoop, resetCarousel, resetPosition (+4)                    |
| `src/features/fund-detail/composables/useFundBenchmarkDataSource.ts` | load, load, subscribe, cancel, cleanup (+3)                                                            |
| `src/features/fund-detail/composables/useFundMetrics.test.ts`        | source, benchmarkSource, load, benchmarkHistory, loadDistribution (+3)                                 |

## Entry Points

Start here when exploring this area:

- **`activate`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:50`
- **`selectRange`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:55`
- **`retry`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:64`
- **`refresh`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:69`
- **`request`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:82`

## Key Symbols

| Symbol                       | Type     | File                                                               | Line |
| ---------------------------- | -------- | ------------------------------------------------------------------ | ---- |
| `activate`                   | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 50   |
| `selectRange`                | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 55   |
| `retry`                      | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 64   |
| `refresh`                    | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 69   |
| `request`                    | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 82   |
| `startRequest`               | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 111  |
| `applyResult`                | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 134  |
| `isCurrentTarget`            | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 140  |
| `clearLoading`               | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 161  |
| `calculateFundReinvestedNav` | Function | `src/domains/funds/models/fundReinvestedNav.ts`                    | 30   |
| `loadBatch`                  | Function | `src/features/fund-detail/composables/useFundMetrics.ts`           | 119  |
| `isCurrent`                  | Function | `src/features/fund-detail/composables/useFundMetrics.ts`           | 159  |
| `useFundCumulativeReturns`   | Function | `src/features/fund-detail/composables/useFundCumulativeReturns.ts` | 13   |
| `useFundDistribution`        | Function | `src/features/fund-detail/composables/useFundDistribution.ts`      | 6    |
| `initialize`                 | Function | `src/features/fund-detail/composables/useFundDistribution.ts`      | 26   |
| `close`                      | Function | `src/features/fund-detail/composables/useFundDistribution.ts`      | 52   |
| `cancelActiveRequest`        | Function | `src/features/fund-detail/composables/useFundDistribution.ts`      | 113  |
| `useFundHistoryDataSource`   | Function | `src/features/fund-detail/composables/useFundHistoryDataSource.ts` | 37   |
| `useFundNetValueHistory`     | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`   | 10   |
| `useFundPerformance`         | Function | `src/features/fund-detail/composables/useFundPerformance.ts`       | 33   |

## Execution Flows

| Flow                                       | Type            | Steps |
| ------------------------------------------ | --------------- | ----- |
| `ConfirmHoldings → FormatLocalDate`        | cross_community | 5     |
| `UseQuoteCarousel → ClearLoopResetTimer`   | intra_community | 4     |
| `LoadDistributionHistory → AbortError`     | cross_community | 4     |
| `LoadDistributionHistory → Cleanup`        | cross_community | 4     |
| `LoadNetValues → AbortError`               | cross_community | 4     |
| `LoadNetValues → Cleanup`                  | cross_community | 4     |
| `UseFundPerformance → CancelActiveRequest` | intra_community | 4     |
| `UseFundPerformance → CancelActiveRequest` | cross_community | 4     |
| `UseFundPerformance → ResetViewState`      | cross_community | 4     |
| `ConfirmHoldings → ParsePositiveDecimal`   | cross_community | 4     |

## Connected Areas

| Area        | Connections |
| ----------- | ----------- |
| Models      | 2 calls     |
| Persistence | 1 calls     |

## How to Explore

1. `context({name: "activate"})` — see callers and callees
2. `query({search_query: "composables"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
