---
name: composables
description: 'Skill for the Composables area of pure-hold. 142 symbols across 27 files.'
---

# Composables

142 symbols | 27 files | Cohesion: 96%

## When to Use

- Working with code in `src/`
- Understanding how activate, selectRange, retry work
- Modifying composables-related functionality

## Key Files

| File                                                                 | Symbols                                                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/features/fund-detail/composables/useFundNetValueHistory.ts`     | activate, selectRange, retry, refresh, request (+11)                                                    |
| `src/features/index-settings/composables/useIndexSettingsSession.ts` | selectGroup, addGroup, renameGroup, replaceGroups, saveGroups (+9)                                      |
| `src/features/fund-detail/composables/useFundCumulativeReturns.ts`   | selectReferenceIndex, selectRange, retry, refresh, request (+8)                                         |
| `src/features/fund-detail/composables/useFundDistribution.ts`        | activate, retry, refresh, request, startRequest (+7)                                                    |
| `src/features/fund-search/composables/useFundSearch.ts`              | setKeyword, loadMore, retry, reset, requestPage (+6)                                                    |
| `src/features/index-overview/composables/useQuoteCarousel.ts`        | useQuoteCarousel, handleTransitionEnd, resetLoop, resetCarousel, resetPosition (+4)                     |
| `src/features/fund-detail/composables/useFundDetail.ts`              | open, close, retry, refresh, request (+3)                                                               |
| `src/features/fund-detail/composables/useFundPerformance.ts`         | useFundPerformance, unitNetValueChart, cumulativeNetValueChart, distributionTable, open (+1)            |
| `src/features/fund-search/composables/useFundAdditionSession.ts`     | addWithoutHoldings, confirmHoldings, submit, useFundAdditionSession, open (+1)                          |
| `src/features/fund-detail/composables/useFundPerformance.test.ts`    | loadCumulativeReturns, cumulativeResult, loadDistribution, distributionResult, loadNetValueHistory (+1) |

## Entry Points

Start here when exploring this area:

- **`activate`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:51`
- **`selectRange`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:56`
- **`retry`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:65`
- **`refresh`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:70`
- **`request`** (Function) — `src/features/fund-detail/composables/useFundNetValueHistory.ts:83`

## Key Symbols

| Symbol                    | Type     | File                                                                | Line |
| ------------------------- | -------- | ------------------------------------------------------------------- | ---- |
| `activate`                | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 51   |
| `selectRange`             | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 56   |
| `retry`                   | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 65   |
| `refresh`                 | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 70   |
| `request`                 | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 83   |
| `startRequest`            | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 119  |
| `applyResult`             | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 143  |
| `isCurrentTarget`         | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 149  |
| `clearLoading`            | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts`    | 170  |
| `useQuoteCarousel`        | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 13   |
| `handleTransitionEnd`     | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 70   |
| `resetLoop`               | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 78   |
| `resetCarousel`           | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 87   |
| `resetPosition`           | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 92   |
| `cancelTransitionRestore` | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 115  |
| `updateTimer`             | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 127  |
| `clearTimer`              | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 142  |
| `clearLoopResetTimer`     | Function | `src/features/index-overview/composables/useQuoteCarousel.ts`       | 150  |
| `useFundsStore`           | Function | `src/domains/funds/stores/useFundsStore.ts`                         | 15   |
| `useFundGroupDraft`       | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.ts` | 13   |

## Execution Flows

| Flow                                            | Type            | Steps |
| ----------------------------------------------- | --------------- | ----- |
| `ConfirmHoldings → FormatLocalDate`             | cross_community | 5     |
| `UseQuoteCarousel → ClearLoopResetTimer`        | intra_community | 4     |
| `ConfirmHoldings → ParsePositiveDecimal`        | cross_community | 4     |
| `ConfirmHoldings → ValidatePurchaseDate`        | cross_community | 4     |
| `ResetCarousel → ClearLoopResetTimer`           | intra_community | 4     |
| `HandleTransitionEnd → CancelTransitionRestore` | intra_community | 4     |
| `Initialize → CancelActiveRequest`              | cross_community | 3     |
| `Initialize → CacheKey`                         | cross_community | 3     |
| `Initialize → IsCurrentRequest`                 | cross_community | 3     |
| `Initialize → IsAbortError`                     | cross_community | 3     |

## Connected Areas

| Area        | Connections |
| ----------- | ----------- |
| Models      | 1 calls     |
| Persistence | 1 calls     |

## How to Explore

1. `context({name: "activate"})` — see callers and callees
2. `query({search_query: "composables"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
