---
name: persistence
description: "Skill for the Persistence area of pure-hold. 36 symbols across 8 files."
---

# Persistence

36 symbols | 8 files | Cohesion: 78%

## When to Use

- Working with code in `src/`
- Understanding how loadFundSettings, saveFundSettings, initializeTiantianDeviceId work
- Modifying persistence-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/domains/indices/services/persistence/loadIndexGroups.ts` | backupCorruptedData, loadIndexGroups, filterUnknownQuoteCodes, cloneGroups, areGroupsEqual (+5) |
| `src/domains/funds/services/persistence/validateFundSettings.ts` | validateAndCloneFundSettings, validateFunds, validateHoldingOrder, validateHoldings, validateGroups (+5) |
| `src/domains/funds/services/persistence/loadFundSettings.ts` | loadFundSettings, createEmptyFundSettings, persistRecovery, backupCorruptedData, isRecord |
| `src/domains/indices/services/persistence/saveIndexGroups.ts` | saveIndexGroups, isIndexGroups, isIndexGroupDefinition, isRecord |
| `src/shared/persistence/browserStorageAdapter.ts` | read, write, requestPersistence |
| `src/domains/funds/services/tiantian/tiantianDeviceId.ts` | initializeTiantianDeviceId, getTiantianDeviceId |
| `src/domains/funds/services/persistence/saveFundSettings.ts` | saveFundSettings |
| `src/domains/indices/stores/useIndexQuotesStore.ts` | saveGroups |

## Entry Points

Start here when exploring this area:

- **`loadFundSettings`** (Function) — `src/domains/funds/services/persistence/loadFundSettings.ts:10`
- **`saveFundSettings`** (Function) — `src/domains/funds/services/persistence/saveFundSettings.ts:8`
- **`initializeTiantianDeviceId`** (Function) — `src/domains/funds/services/tiantian/tiantianDeviceId.ts:8`
- **`getTiantianDeviceId`** (Function) — `src/domains/funds/services/tiantian/tiantianDeviceId.ts:26`
- **`validateAndCloneFundSettings`** (Function) — `src/domains/funds/services/persistence/validateFundSettings.ts:4`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `loadFundSettings` | Function | `src/domains/funds/services/persistence/loadFundSettings.ts` | 10 |
| `saveFundSettings` | Function | `src/domains/funds/services/persistence/saveFundSettings.ts` | 8 |
| `initializeTiantianDeviceId` | Function | `src/domains/funds/services/tiantian/tiantianDeviceId.ts` | 8 |
| `getTiantianDeviceId` | Function | `src/domains/funds/services/tiantian/tiantianDeviceId.ts` | 26 |
| `validateAndCloneFundSettings` | Function | `src/domains/funds/services/persistence/validateFundSettings.ts` | 4 |
| `loadIndexGroups` | Function | `src/domains/indices/services/persistence/loadIndexGroups.ts` | 16 |
| `saveIndexGroups` | Function | `src/domains/indices/services/persistence/saveIndexGroups.ts` | 7 |
| `saveGroups` | Function | `src/domains/indices/stores/useIndexQuotesStore.ts` | 154 |
| `read` | Method | `src/shared/persistence/browserStorageAdapter.ts` | 10 |
| `write` | Method | `src/shared/persistence/browserStorageAdapter.ts` | 11 |
| `requestPersistence` | Method | `src/shared/persistence/browserStorageAdapter.ts` | 12 |
| `createEmptyFundSettings` | Function | `src/domains/funds/services/persistence/loadFundSettings.ts` | 42 |
| `persistRecovery` | Function | `src/domains/funds/services/persistence/loadFundSettings.ts` | 46 |
| `backupCorruptedData` | Function | `src/domains/funds/services/persistence/loadFundSettings.ts` | 54 |
| `isRecord` | Function | `src/domains/funds/services/persistence/loadFundSettings.ts` | 58 |
| `backupCorruptedData` | Function | `src/domains/indices/services/persistence/loadIndexGroups.ts` | 123 |
| `validateFunds` | Function | `src/domains/funds/services/persistence/validateFundSettings.ts` | 31 |
| `validateHoldingOrder` | Function | `src/domains/funds/services/persistence/validateFundSettings.ts` | 46 |
| `validateHoldings` | Function | `src/domains/funds/services/persistence/validateFundSettings.ts` | 68 |
| `validateGroups` | Function | `src/domains/funds/services/persistence/validateFundSettings.ts` | 100 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ApplySettingsEffect → Read` | cross_community | 8 |
| `RefreshAll → Read` | cross_community | 8 |
| `RefreshCodes → Write` | cross_community | 7 |
| `FetchTiantianFundHoldingsDisclosure → Read` | cross_community | 7 |
| `FetchTiantianFundHoldingsDisclosure → Write` | cross_community | 7 |
| `HandleStorageChange → Write` | cross_community | 6 |
| `HandleStorageChange → IsIndexGroups` | cross_community | 6 |
| `FetchTiantianFundAssetAllocation → Read` | cross_community | 6 |
| `FetchTiantianFundAssetAllocation → Write` | cross_community | 6 |
| `FetchTiantianFundBasicInfo → Read` | cross_community | 6 |

## How to Explore

1. `context({name: "loadFundSettings"})` — see callers and callees
2. `query({search_query: "persistence"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
