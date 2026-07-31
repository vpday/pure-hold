---
name: stores
description: 'Skill for the Stores area of pure-hold. 43 symbols across 13 files.'
---

# Stores

43 symbols | 13 files | Cohesion: 81%

## When to Use

- Working with code in `src/`
- Understanding how fetchTencentMarketStatus, parseTencentMarketStatus, selectOpenMarketIndexDefinitions work
- Modifying stores-related functionality

## Key Files

| File                                                                   | Symbols                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/domains/indices/stores/useIndexQuotesStore.ts`                    | refresh, refreshOpenMarkets, runRefresh, applyBatch, startPolling (+12)                                 |
| `src/domains/funds/stores/useFundsStore.ts`                            | replaceGroups, replaceFundOrganization, updateFundHolding, updateFundGroupMembership, currentState (+7) |
| `src/domains/funds/stores/useFundsStore.test.ts`                       | createTestFundState, withEnvironment, ToggleStorage                                                     |
| `src/domains/funds/services/persistence/saveFundState.ts`              | saveFundState, getLocalStorage                                                                          |
| `src/domains/indices/services/tencent/fetchTencentMarketStatus.ts`     | fetchTencentMarketStatus                                                                                |
| `src/domains/indices/services/tencent/parseTencentMarketStatus.ts`     | parseTencentMarketStatus                                                                                |
| `src/domains/indices/stores/selectOpenMarketIndexDefinitions.ts`       | selectOpenMarketIndexDefinitions                                                                        |
| `src/domains/funds/services/tiantian/createTiantianFundRequestBody.ts` | createTiantianFundRequestBody                                                                           |
| `src/domains/funds/services/tiantian/fetchTiantianFundSnapshots.ts`    | fetchTiantianFundSnapshots                                                                              |
| `src/domains/funds/stores/mergeFundRefreshResult.ts`                   | mergeFundRefreshResult                                                                                  |

## Entry Points

Start here when exploring this area:

- **`fetchTencentMarketStatus`** (Function) — `src/domains/indices/services/tencent/fetchTencentMarketStatus.ts:5`
- **`parseTencentMarketStatus`** (Function) — `src/domains/indices/services/tencent/parseTencentMarketStatus.ts:2`
- **`selectOpenMarketIndexDefinitions`** (Function) — `src/domains/indices/stores/selectOpenMarketIndexDefinitions.ts:2`
- **`refresh`** (Function) — `src/domains/indices/stores/useIndexQuotesStore.ts:41`
- **`refreshOpenMarkets`** (Function) — `src/domains/indices/stores/useIndexQuotesStore.ts:45`

## Key Symbols

| Symbol                             | Type     | File                                                                   | Line |
| ---------------------------------- | -------- | ---------------------------------------------------------------------- | ---- |
| `fetchTencentMarketStatus`         | Function | `src/domains/indices/services/tencent/fetchTencentMarketStatus.ts`     | 5    |
| `parseTencentMarketStatus`         | Function | `src/domains/indices/services/tencent/parseTencentMarketStatus.ts`     | 2    |
| `selectOpenMarketIndexDefinitions` | Function | `src/domains/indices/stores/selectOpenMarketIndexDefinitions.ts`       | 2    |
| `refresh`                          | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 41   |
| `refreshOpenMarkets`               | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 45   |
| `runRefresh`                       | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 66   |
| `applyBatch`                       | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 123  |
| `startPolling`                     | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 171  |
| `stopPolling`                      | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 181  |
| `handleVisibilityChange`           | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 193  |
| `refreshWhenCurrentRequestSettles` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 205  |
| `refreshVisibleQuotes`             | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 206  |
| `clearRefreshTimer`                | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                    | 221  |
| `saveFundState`                    | Function | `src/domains/funds/services/persistence/saveFundState.ts`              | 4    |
| `replaceGroups`                    | Function | `src/domains/funds/stores/useFundsStore.ts`                            | 179  |
| `replaceFundOrganization`          | Function | `src/domains/funds/stores/useFundsStore.ts`                            | 190  |
| `updateFundHolding`                | Function | `src/domains/funds/stores/useFundsStore.ts`                            | 219  |
| `updateFundGroupMembership`        | Function | `src/domains/funds/stores/useFundsStore.ts`                            | 240  |
| `currentState`                     | Function | `src/domains/funds/stores/useFundsStore.ts`                            | 272  |
| `createTiantianFundRequestBody`    | Function | `src/domains/funds/services/tiantian/createTiantianFundRequestBody.ts` | 5    |

## Execution Flows

| Flow                                            | Type            | Steps |
| ----------------------------------------------- | --------------- | ----- |
| `HandleStorageChange → IsRecord`                | cross_community | 7     |
| `HandleStorageChange → IsCodePart`              | cross_community | 7     |
| `StartPolling → ApplyBatch`                     | intra_community | 7     |
| `StartPolling → IsAbortError`                   | intra_community | 7     |
| `StartPolling → CreateEastmoneyQuoteRequestUrl` | cross_community | 7     |
| `HandleVisibilityChange → IsAbortError`         | intra_community | 6     |
| `SyncFromStorage → Issue`                       | cross_community | 6     |
| `HandleStorageChange → IsIndexGroups`           | cross_community | 6     |
| `HandleStorageChange → GetLocalStorage`         | cross_community | 6     |
| `HandleStorageChange → ApplyBatch`              | cross_community | 6     |

## Connected Areas

| Area        | Connections |
| ----------- | ----------- |
| Persistence | 3 calls     |
| Eastmoney   | 2 calls     |
| Tiantian    | 2 calls     |

## How to Explore

1. `context({name: "fetchTencentMarketStatus"})` — see callers and callees
2. `query({search_query: "stores"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
