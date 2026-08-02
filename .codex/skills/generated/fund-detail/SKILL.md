---
name: fund-detail
description: 'Skill for the Fund-detail area of pure-hold. 7 symbols across 1 files.'
---

# Fund-detail

7 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how refresh, activateMetrics, retryMetrics work
- Modifying fund-detail-related functionality

## Key Files

| File                                           | Symbols                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `src/features/fund-detail/FundDetailEntry.vue` | refresh, activateMetrics, retryMetrics, showMetricsWarning, open (+2) |

## Entry Points

Start here when exploring this area:

- **`refresh`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:94`
- **`activateMetrics`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:99`
- **`retryMetrics`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:104`
- **`showMetricsWarning`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:109`
- **`open`** (Function) — `src/features/fund-detail/FundDetailEntry.vue:75`

## Key Symbols

| Symbol               | Type     | File                                           | Line |
| -------------------- | -------- | ---------------------------------------------- | ---- |
| `refresh`            | Function | `src/features/fund-detail/FundDetailEntry.vue` | 94   |
| `activateMetrics`    | Function | `src/features/fund-detail/FundDetailEntry.vue` | 99   |
| `retryMetrics`       | Function | `src/features/fund-detail/FundDetailEntry.vue` | 104  |
| `showMetricsWarning` | Function | `src/features/fund-detail/FundDetailEntry.vue` | 109  |
| `open`               | Function | `src/features/fund-detail/FundDetailEntry.vue` | 75   |
| `close`              | Function | `src/features/fund-detail/FundDetailEntry.vue` | 88   |
| `edit`               | Function | `src/features/fund-detail/FundDetailEntry.vue` | 129  |

## How to Explore

1. `context({name: "refresh"})` — see callers and callees
2. `query({search_query: "fund-detail"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
