---
name: fund-detail
description: 'Skill for the Fund-detail area of pure-hold. 3 symbols across 1 files.'
---

# Fund-detail

3 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how open, close, edit work
- Modifying fund-detail-related functionality

## Key Files

| File                                           | Symbols           |
| ---------------------------------------------- | ----------------- |
| `src/features/fund-detail/FundDetailEntry.vue` | open, close, edit |

## Entry Points

Start here when exploring this area:

- **`open`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:49`
- **`close`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:61`
- **`edit`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:70`

## Key Symbols

| Symbol  | Type     | File                                           | Line |
| ------- | -------- | ---------------------------------------------- | ---- |
| `open`  | Function | `src/features/fund-detail/FundDetailEntry.vue` | 49   |
| `close` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 61   |
| `edit`  | Function | `src/features/fund-detail/FundDetailEntry.vue` | 70   |

## How to Explore

1. `context({name: "open"})` — see callers and callees
2. `query({search_query: "fund-detail"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
