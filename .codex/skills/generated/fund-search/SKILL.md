---
name: fund-search
description: 'Skill for the Fund-search area of pure-hold. 5 symbols across 1 files.'
---

# Fund-search

5 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how open, close, addWithoutHoldings work
- Modifying fund-search-related functionality

## Key Files

| File                                           | Symbols                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `src/features/fund-search/FundSearchEntry.vue` | open, close, addWithoutHoldings, confirmHoldings, handleSuccess |

## Entry Points

Start here when exploring this area:

- **`open`** (Function) — `src/features/fund-search/FundSearchEntry.vue:15`
- **`close`** (Function) — `src/features/fund-search/FundSearchEntry.vue:21`
- **`addWithoutHoldings`** (Function) — `src/features/fund-search/FundSearchEntry.vue:26`
- **`confirmHoldings`** (Function) — `src/features/fund-search/FundSearchEntry.vue:30`
- **`handleSuccess`** (Function) — `src/features/fund-search/FundSearchEntry.vue:34`

## Key Symbols

| Symbol               | Type     | File                                           | Line |
| -------------------- | -------- | ---------------------------------------------- | ---- |
| `open`               | Function | `src/features/fund-search/FundSearchEntry.vue` | 15   |
| `close`              | Function | `src/features/fund-search/FundSearchEntry.vue` | 21   |
| `addWithoutHoldings` | Function | `src/features/fund-search/FundSearchEntry.vue` | 26   |
| `confirmHoldings`    | Function | `src/features/fund-search/FundSearchEntry.vue` | 30   |
| `handleSuccess`      | Function | `src/features/fund-search/FundSearchEntry.vue` | 34   |

## How to Explore

1. `context({name: "open"})` — see callers and callees
2. `query({search_query: "fund-search"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
