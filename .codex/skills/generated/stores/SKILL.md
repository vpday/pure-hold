---
name: stores
description: "Skill for the Stores area of pure-hold. 55 symbols across 10 files."
---

# Stores

55 symbols | 10 files | Cohesion: 87%

## When to Use

- Working with code in `src/`
- Understanding how fetchTencentMarketStatus, parseTencentMarketStatus, selectOpenMarketIndexDefinitions work
- Modifying stores-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/domains/indices/stores/useIndexQuotesStore.ts` | refresh, refreshOpenMarkets, runRefresh, applyBatch, startPolling (+12) |
| `src/domains/funds/stores/createFundSettingsCommandModule.ts` | createFundSettingsCommandModule, createCandidate, createAddCandidate, createDeleteCandidate, createOrganizationCandidate (+7) |
| `src/domains/funds/stores/createFundMarketRuntime.ts` | refreshAll, refreshCodes, syncObservedNames, advancePreviousSnapshots, isConfirmedDateAdvance (+5) |
| `src/domains/funds/stores/useFundsStore.ts` | addFunds, deleteFund, replaceGroups, replaceFundOrganization, updateFundHolding (+4) |
| `src/domains/funds/stores/mergeFundRefreshResult.ts` | mergeFundRefreshResult, isConfirmedSnapshotRegression |
| `src/domains/indices/services/tencent/fetchTencentMarketStatus.ts` | fetchTencentMarketStatus |
| `src/domains/indices/services/tencent/parseTencentMarketStatus.ts` | parseTencentMarketStatus |
| `src/domains/indices/stores/selectOpenMarketIndexDefinitions.ts` | selectOpenMarketIndexDefinitions |
| `src/domains/funds/models/createEmptyFundSnapshot.ts` | createEmptyFundSnapshot |
| `src/domains/indices/stores/selectActiveIndexDefinitions.ts` | selectActiveIndexDefinitions |

## Entry Points

Start here when exploring this area:

- **`fetchTencentMarketStatus`** (Function) — `src/domains/indices/services/tencent/fetchTencentMarketStatus.ts:5`
- **`parseTencentMarketStatus`** (Function) — `src/domains/indices/services/tencent/parseTencentMarketStatus.ts:2`
- **`selectOpenMarketIndexDefinitions`** (Function) — `src/domains/indices/stores/selectOpenMarketIndexDefinitions.ts:2`
- **`refresh`** (Function) — `src/domains/indices/stores/useIndexQuotesStore.ts:41`
- **`refreshOpenMarkets`** (Function) — `src/domains/indices/stores/useIndexQuotesStore.ts:45`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `fetchTencentMarketStatus` | Function | `src/domains/indices/services/tencent/fetchTencentMarketStatus.ts` | 5 |
| `parseTencentMarketStatus` | Function | `src/domains/indices/services/tencent/parseTencentMarketStatus.ts` | 2 |
| `selectOpenMarketIndexDefinitions` | Function | `src/domains/indices/stores/selectOpenMarketIndexDefinitions.ts` | 2 |
| `refresh` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 41 |
| `refreshOpenMarkets` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 45 |
| `runRefresh` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 66 |
| `applyBatch` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 123 |
| `startPolling` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 171 |
| `stopPolling` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 181 |
| `handleVisibilityChange` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 193 |
| `refreshWhenCurrentRequestSettles` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 205 |
| `refreshVisibleQuotes` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 206 |
| `clearRefreshTimer` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 221 |
| `refreshAll` | Function | `src/domains/funds/stores/createFundMarketRuntime.ts` | 48 |
| `refreshCodes` | Function | `src/domains/funds/stores/createFundMarketRuntime.ts` | 53 |
| `syncObservedNames` | Function | `src/domains/funds/stores/createFundMarketRuntime.ts` | 151 |
| `mergeFundRefreshResult` | Function | `src/domains/funds/stores/mergeFundRefreshResult.ts` | 10 |
| `addFunds` | Function | `src/domains/funds/stores/useFundsStore.ts` | 36 |
| `deleteFund` | Function | `src/domains/funds/stores/useFundsStore.ts` | 46 |
| `replaceGroups` | Function | `src/domains/funds/stores/useFundsStore.ts` | 58 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ApplySettingsEffect → Read` | cross_community | 8 |
| `RefreshAll → Read` | cross_community | 8 |
| `ApplySettingsEffect → ToRequiredString` | cross_community | 7 |
| `ApplySettingsEffect → IsRecord` | cross_community | 7 |
| `RefreshCodes → Write` | cross_community | 7 |
| `HandleStorageChange → IsRecord` | cross_community | 7 |
| `HandleStorageChange → IsCodePart` | cross_community | 7 |
| `RefreshAll → ToRequiredString` | cross_community | 7 |
| `RefreshAll → IsRecord` | cross_community | 7 |
| `StartPolling → ApplyBatch` | intra_community | 7 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Persistence | 4 calls |
| Eastmoney | 2 calls |
| Tiantian | 1 calls |

## How to Explore

1. `context({name: "fetchTencentMarketStatus"})` — see callers and callees
2. `query({search_query: "stores"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
