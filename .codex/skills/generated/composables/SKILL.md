---
name: composables
description: "Skill for the Composables area of pure-hold. 320 symbols across 45 files."
---

# Composables

320 symbols | 45 files | Cohesion: 93%

## When to Use

- Working with code in `src/`
- Understanding how useFundAssetAllocation, useFundHoldings, open work
- Modifying composables-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/features/fund-detail/composables/useFundHoldings.ts` | useFundHoldings, open, close, activate, refreshQuotes (+15) |
| `src/features/fund-detail/composables/useFundNetValueHistory.ts` | activate, selectRange, retry, refresh, request (+10) |
| `src/features/fund-detail/composables/useFundRollingExcessReturn.ts` | startRequest, activate, selectRange, retry, refresh (+9) |
| `src/features/index-settings/composables/useIndexSettingsSession.ts` | selectGroup, addGroup, renameGroup, replaceGroups, saveGroups (+9) |
| `src/features/fund-detail/composables/useFundAssetAllocation.ts` | useFundAssetAllocation, activate, retry, refresh, request (+8) |
| `src/features/fund-detail/composables/useFundMetrics.ts` | useFundMetrics, open, close, cancelActiveRequest, emptyQuality (+8) |
| `src/features/fund-detail/composables/useFundCumulativeExcessReturn.ts` | startRequest, promise, activate, retry, refresh (+7) |
| `src/features/fund-detail/composables/useFundDrawdownComparison.ts` | startRequest, promise, activate, retry, refresh (+7) |
| `src/features/fund-detail/composables/useFundReinvestedNavHistory.ts` | startRequest, promise, activate, retry, refresh (+7) |
| `src/features/fund-detail/composables/useFundCumulativeReturns.ts` | selectReferenceIndex, selectRange, retry, refresh, request (+7) |

## Entry Points

Start here when exploring this area:

- **`useFundAssetAllocation`** (Function) — `src/features/fund-detail/composables/useFundAssetAllocation.ts:10`
- **`useFundHoldings`** (Function) — `src/features/fund-detail/composables/useFundHoldings.ts:37`
- **`open`** (Function) — `src/features/fund-detail/composables/useFundHoldings.ts:108`
- **`close`** (Function) — `src/features/fund-detail/composables/useFundHoldings.ts:114`
- **`activate`** (Function) — `src/features/fund-detail/composables/useFundHoldings.ts:120`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `useFundAssetAllocation` | Function | `src/features/fund-detail/composables/useFundAssetAllocation.ts` | 10 |
| `useFundHoldings` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 37 |
| `open` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 108 |
| `close` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 114 |
| `activate` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 120 |
| `refreshQuotes` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 220 |
| `selectView` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 269 |
| `retryQuotes` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 302 |
| `updatePolling` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 306 |
| `stopPolling` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 319 |
| `resetSession` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 324 |
| `isCurrentQuotesRequest` | Function | `src/features/fund-detail/composables/useFundHoldings.ts` | 366 |
| `activate` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 36 |
| `selectRange` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 41 |
| `retry` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 48 |
| `refresh` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 53 |
| `request` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 66 |
| `startRequest` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 91 |
| `applyResult` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 114 |
| `isCurrentTarget` | Function | `src/features/fund-detail/composables/useFundNetValueHistory.ts` | 120 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Activate → UniqueByDate` | cross_community | 7 |
| `Activate → IsIsoDate` | cross_community | 7 |
| `Activate → FormatDate` | cross_community | 7 |
| `Activate → SourceIssues` | cross_community | 6 |
| `SelectView → IsCurrentDisclosureRequest` | cross_community | 5 |
| `SelectView → IsAbortError` | cross_community | 5 |
| `RetryHoldings → QuoteRequests` | cross_community | 5 |
| `ConfirmHoldings → FormatLocalDate` | cross_community | 5 |
| `Refresh → QuoteRequests` | cross_community | 5 |
| `UseFundPerformance → CancelActiveRequest` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Models | 6 calls |
| Stores | 1 calls |
| Presenters | 1 calls |

## How to Explore

1. `context({name: "useFundAssetAllocation"})` — see callers and callees
2. `query({search_query: "composables"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
