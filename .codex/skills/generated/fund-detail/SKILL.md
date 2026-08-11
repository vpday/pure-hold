---
name: fund-detail
description: "Skill for the Fund-detail area of pure-hold. 6 symbols across 1 files."
---

# Fund-detail

6 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how open, close, edit work
- Modifying fund-detail-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/features/fund-detail/FundDetailEntry.vue` | open, close, edit, refresh, retryMetrics (+1) |

## Entry Points

Start here when exploring this area:

- **`open`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:67`
- **`close`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:81`
- **`edit`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:112`
- **`refresh`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:88`
- **`retryMetrics`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:102`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `open` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 67 |
| `close` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 81 |
| `edit` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 112 |
| `refresh` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 88 |
| `retryMetrics` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 102 |
| `showMetricsRefreshWarning` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 106 |

## How to Explore

1. `context({name: "open"})` — see callers and callees
2. `query({search_query: "fund-detail"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
