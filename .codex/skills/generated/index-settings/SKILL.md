---
name: index-settings
description: "Skill for the Index-settings area of pure-hold. 5 symbols across 1 files."
---

# Index-settings

5 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how handleAddGroup, handleRenameGroup, handleResult work
- Modifying index-settings-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/features/index-settings/IndexSettingsEntry.vue` | handleAddGroup, handleRenameGroup, handleResult, close, handleConfirm |

## Entry Points

Start here when exploring this area:

- **`handleAddGroup`** (Function) — `src/features/index-settings/IndexSettingsEntry.vue:29`
- **`handleRenameGroup`** (Function) — `src/features/index-settings/IndexSettingsEntry.vue:33`
- **`handleResult`** (Function) — `src/features/index-settings/IndexSettingsEntry.vue:37`
- **`close`** (Function) — `src/features/index-settings/IndexSettingsEntry.vue:24`
- **`handleConfirm`** (Function) — `src/features/index-settings/IndexSettingsEntry.vue:41`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleAddGroup` | Function | `src/features/index-settings/IndexSettingsEntry.vue` | 29 |
| `handleRenameGroup` | Function | `src/features/index-settings/IndexSettingsEntry.vue` | 33 |
| `handleResult` | Function | `src/features/index-settings/IndexSettingsEntry.vue` | 37 |
| `close` | Function | `src/features/index-settings/IndexSettingsEntry.vue` | 24 |
| `handleConfirm` | Function | `src/features/index-settings/IndexSettingsEntry.vue` | 41 |

## How to Explore

1. `context({name: "handleAddGroup"})` — see callers and callees
2. `query({search_query: "index-settings"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
