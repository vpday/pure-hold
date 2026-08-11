---
name: testing
description: "Skill for the Testing area of pure-hold. 16 symbols across 8 files."
---

# Testing

16 symbols | 8 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how resetTiantianDeviceIdForTests, installLocalStorage, installLocalStorageGetter work
- Modifying testing-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/shared/testing/browserStorageTestSupport.ts` | MemoryStorage, getItem, installLocalStorage, installLocalStorageGetter, installLocalStorageDescriptor (+2) |
| `src/domains/funds/stores/useFundsStore.runtimeSeparation.test.ts` | readStoredSettings, withEnvironment |
| `src/domains/indices/services/persistence/indexGroupsPersistence.test.ts` | readStoredGroups, withStorage |
| `src/domains/funds/services/persistence/fundSettingsPersistence.test.ts` | withStorage |
| `src/domains/funds/services/tiantian/tiantianDeviceId.test.ts` | withStorage |
| `src/domains/funds/services/tiantian/tiantianDeviceId.ts` | resetTiantianDeviceIdForTests |
| `src/domains/funds/stores/useFundsStore.test.ts` | withEnvironment |
| `src/features/fund-group-settings/composables/useFundGroupDraft.test.ts` | withStorage |

## Entry Points

Start here when exploring this area:

- **`resetTiantianDeviceIdForTests`** (Function) — `src/domains/funds/services/tiantian/tiantianDeviceId.ts:30`
- **`installLocalStorage`** (Function) — `src/shared/testing/browserStorageTestSupport.ts:46`
- **`installLocalStorageGetter`** (Function) — `src/shared/testing/browserStorageTestSupport.ts:50`
- **`installLocalStorageDescriptor`** (Function) — `src/shared/testing/browserStorageTestSupport.ts:54`
- **`MemoryStorage`** (Class) — `src/shared/testing/browserStorageTestSupport.ts:0`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `MemoryStorage` | Class | `src/shared/testing/browserStorageTestSupport.ts` | 0 |
| `resetTiantianDeviceIdForTests` | Function | `src/domains/funds/services/tiantian/tiantianDeviceId.ts` | 30 |
| `installLocalStorage` | Function | `src/shared/testing/browserStorageTestSupport.ts` | 46 |
| `installLocalStorageGetter` | Function | `src/shared/testing/browserStorageTestSupport.ts` | 50 |
| `installLocalStorageDescriptor` | Function | `src/shared/testing/browserStorageTestSupport.ts` | 54 |
| `getItem` | Method | `src/shared/testing/browserStorageTestSupport.ts` | 17 |
| `key` | Method | `src/shared/testing/browserStorageTestSupport.ts` | 25 |
| `keys` | Method | `src/shared/testing/browserStorageTestSupport.ts` | 29 |
| `withStorage` | Function | `src/domains/funds/services/persistence/fundSettingsPersistence.test.ts` | 261 |
| `withStorage` | Function | `src/domains/funds/services/tiantian/tiantianDeviceId.test.ts` | 54 |
| `readStoredSettings` | Function | `src/domains/funds/stores/useFundsStore.runtimeSeparation.test.ts` | 223 |
| `withEnvironment` | Function | `src/domains/funds/stores/useFundsStore.runtimeSeparation.test.ts` | 237 |
| `withEnvironment` | Function | `src/domains/funds/stores/useFundsStore.test.ts` | 326 |
| `readStoredGroups` | Function | `src/domains/indices/services/persistence/indexGroupsPersistence.test.ts` | 108 |
| `withStorage` | Function | `src/domains/indices/services/persistence/indexGroupsPersistence.test.ts` | 120 |
| `withStorage` | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.test.ts` | 100 |

## How to Explore

1. `context({name: "resetTiantianDeviceIdForTests"})` — see callers and callees
2. `query({search_query: "testing"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
