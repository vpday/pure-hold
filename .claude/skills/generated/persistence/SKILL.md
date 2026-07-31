---
name: persistence
description: 'Skill for the Persistence area of pure-hold. 49 symbols across 7 files.'
---

# Persistence

49 symbols | 7 files | Cohesion: 88%

## When to Use

- Working with code in `src/`
- Understanding how validateAndCloneFundState, loadFundState, loadIndexGroups work
- Modifying persistence-related functionality

## Key Files

| File                                                                      | Symbols                                                                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/domains/funds/services/persistence/validateFundState.ts`             | validateAndCloneFundState, validateHoldingOrder, validateHoldings, validateGroups, validateUniqueStrings (+7) |
| `src/domains/indices/services/persistence/loadIndexGroups.ts`             | loadIndexGroups, filterUnknownQuoteCodes, cloneGroups, areGroupsEqual, backupCorruptedData (+7)               |
| `src/domains/funds/services/persistence/loadFundState.ts`                 | loadFundState, createEmptyFundState, persistRecovery, backupCorruptedData, requestPersistentStorage (+2)      |
| `src/domains/indices/services/persistence/indexGroupsPersistence.test.ts` | withStorage, MemoryStorage, ThrowingStorage, readStoredGroups, getItem (+2)                                   |
| `src/domains/indices/services/persistence/saveIndexGroups.ts`             | saveIndexGroups, isIndexGroups, getLocalStorage, isIndexGroupDefinition, isRecord                             |
| `src/domains/funds/services/persistence/fundStatePersistence.test.ts`     | withStorage, MemoryStorage, ThrowingStorage, key, keys                                                        |
| `src/domains/indices/stores/useIndexQuotesStore.ts`                       | saveGroups                                                                                                    |

## Entry Points

Start here when exploring this area:

- **`validateAndCloneFundState`** (Function) — `src/domains/funds/services/persistence/validateFundState.ts:18`
- **`loadFundState`** (Function) — `src/domains/funds/services/persistence/loadFundState.ts:9`
- **`loadIndexGroups`** (Function) — `src/domains/indices/services/persistence/loadIndexGroups.ts:15`
- **`saveIndexGroups`** (Function) — `src/domains/indices/services/persistence/saveIndexGroups.ts:6`
- **`saveGroups`** (Function) — `src/domains/indices/stores/useIndexQuotesStore.ts:154`

## Key Symbols

| Symbol                             | Type     | File                                                                      | Line |
| ---------------------------------- | -------- | ------------------------------------------------------------------------- | ---- |
| `validateAndCloneFundState`        | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 18   |
| `loadFundState`                    | Function | `src/domains/funds/services/persistence/loadFundState.ts`                 | 9    |
| `loadIndexGroups`                  | Function | `src/domains/indices/services/persistence/loadIndexGroups.ts`             | 15   |
| `saveIndexGroups`                  | Function | `src/domains/indices/services/persistence/saveIndexGroups.ts`             | 6    |
| `saveGroups`                       | Function | `src/domains/indices/stores/useIndexQuotesStore.ts`                       | 154  |
| `MemoryStorage`                    | Class    | `src/domains/funds/services/persistence/fundStatePersistence.test.ts`     | 284  |
| `ThrowingStorage`                  | Class    | `src/domains/funds/services/persistence/fundStatePersistence.test.ts`     | 309  |
| `MemoryStorage`                    | Class    | `src/domains/indices/services/persistence/indexGroupsPersistence.test.ts` | 116  |
| `ThrowingStorage`                  | Class    | `src/domains/indices/services/persistence/indexGroupsPersistence.test.ts` | 148  |
| `validateHoldingOrder`             | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 68   |
| `validateHoldings`                 | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 90   |
| `validateGroups`                   | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 122  |
| `validateUniqueStrings`            | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 161  |
| `isFundSnapshot`                   | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 172  |
| `cloneSnapshot`                    | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 197  |
| `isNullableFiniteNumber`           | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 205  |
| `isNullableString`                 | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 209  |
| `isPositiveNumberWithFourDecimals` | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 213  |
| `isValidPurchaseDate`              | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 219  |
| `isRecord`                         | Function | `src/domains/funds/services/persistence/validateFundState.ts`             | 235  |

## Execution Flows

| Flow                                               | Type            | Steps |
| -------------------------------------------------- | --------------- | ----- |
| `HandleStorageChange → IsIndexGroups`              | cross_community | 6     |
| `HandleStorageChange → GetLocalStorage`            | cross_community | 6     |
| `RefreshAll → IsRecord`                            | cross_community | 6     |
| `AddFunds → IsRecord`                              | cross_community | 5     |
| `AddFunds → IsNullableFiniteNumber`                | cross_community | 5     |
| `AddFunds → IsNullableString`                      | cross_community | 5     |
| `ReplaceFundOrganization → IsRecord`               | cross_community | 5     |
| `ReplaceFundOrganization → IsNullableFiniteNumber` | cross_community | 5     |
| `ReplaceFundOrganization → IsNullableString`       | cross_community | 5     |
| `DeleteFund → IsRecord`                            | cross_community | 5     |

## Connected Areas

| Area   | Connections |
| ------ | ----------- |
| Stores | 2 calls     |

## How to Explore

1. `context({name: "validateAndCloneFundState"})` — see callers and callees
2. `query({search_query: "persistence"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
