---
name: fund-group-settings
description: 'Skill for the Fund-group-settings area of pure-hold. 4 symbols across 1 files.'
---

# Fund-group-settings

4 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how close, confirm, handleResult work
- Modifying fund-group-settings-related functionality

## Key Files

| File                                                          | Symbols                                    |
| ------------------------------------------------------------- | ------------------------------------------ |
| `src/features/fund-group-settings/FundGroupSettingsEntry.vue` | close, confirm, handleResult, handleRename |

## Entry Points

Start here when exploring this area:

- **`close`** (Function) — `src/features/fund-group-settings/FundGroupSettingsEntry.vue:36`
- **`confirm`** (Function) — `src/features/fund-group-settings/FundGroupSettingsEntry.vue:61`
- **`handleResult`** (Function) — `src/features/fund-group-settings/FundGroupSettingsEntry.vue:42`
- **`handleRename`** (Function) — `src/features/fund-group-settings/FundGroupSettingsEntry.vue:46`

## Key Symbols

| Symbol         | Type     | File                                                          | Line |
| -------------- | -------- | ------------------------------------------------------------- | ---- |
| `close`        | Function | `src/features/fund-group-settings/FundGroupSettingsEntry.vue` | 36   |
| `confirm`      | Function | `src/features/fund-group-settings/FundGroupSettingsEntry.vue` | 61   |
| `handleResult` | Function | `src/features/fund-group-settings/FundGroupSettingsEntry.vue` | 42   |
| `handleRename` | Function | `src/features/fund-group-settings/FundGroupSettingsEntry.vue` | 46   |

## How to Explore

1. `context({name: "close"})` — see callers and callees
2. `query({search_query: "fund-group-settings"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
