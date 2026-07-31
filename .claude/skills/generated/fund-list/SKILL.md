---
name: fund-list
description: 'Skill for the Fund-list area of pure-hold. 10 symbols across 4 files.'
---

# Fund-list

10 symbols | 4 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how latestEstimatedAt, latestNavDate, latestText work
- Modifying fund-list-related functionality

## Key Files

| File                                                          | Symbols                                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/features/fund-list/FundListSection.vue`                  | latestEstimatedAt, latestNavDate, latestText, categories, clearSavedCategorySorts |
| `src/features/fund-list/presenters/formatFundDates.ts`        | formatEstimatedDisplayDate, formatNavDisplayDate, parseFundDate                   |
| `src/features/fund-list/presenters/buildFundCategories.ts`    | buildFundCategories                                                               |
| `src/features/fund-list/presenters/clearFundCategorySorts.ts` | clearFundCategorySorts                                                            |

## Entry Points

Start here when exploring this area:

- **`latestEstimatedAt`** (Function) — `src/features/fund-list/FundListSection.vue:54`
- **`latestNavDate`** (Function) — `src/features/fund-list/FundListSection.vue:57`
- **`latestText`** (Function) — `src/features/fund-list/FundListSection.vue:108`
- **`formatEstimatedDisplayDate`** (Function) — `src/features/fund-list/presenters/formatFundDates.ts:0`
- **`formatNavDisplayDate`** (Function) — `src/features/fund-list/presenters/formatFundDates.ts:18`

## Key Symbols

| Symbol                       | Type     | File                                                          | Line |
| ---------------------------- | -------- | ------------------------------------------------------------- | ---- |
| `latestEstimatedAt`          | Function | `src/features/fund-list/FundListSection.vue`                  | 54   |
| `latestNavDate`              | Function | `src/features/fund-list/FundListSection.vue`                  | 57   |
| `latestText`                 | Function | `src/features/fund-list/FundListSection.vue`                  | 108  |
| `formatEstimatedDisplayDate` | Function | `src/features/fund-list/presenters/formatFundDates.ts`        | 0    |
| `formatNavDisplayDate`       | Function | `src/features/fund-list/presenters/formatFundDates.ts`        | 18   |
| `parseFundDate`              | Function | `src/features/fund-list/presenters/formatFundDates.ts`        | 23   |
| `categories`                 | Function | `src/features/fund-list/FundListSection.vue`                  | 30   |
| `buildFundCategories`        | Function | `src/features/fund-list/presenters/buildFundCategories.ts`    | 8    |
| `clearSavedCategorySorts`    | Function | `src/features/fund-list/FundListSection.vue`                  | 93   |
| `clearFundCategorySorts`     | Function | `src/features/fund-list/presenters/clearFundCategorySorts.ts` | 2    |

## Execution Flows

| Flow                                | Type            | Steps |
| ----------------------------------- | --------------- | ----- |
| `LatestEstimatedAt → ParseFundDate` | intra_community | 3     |
| `LatestNavDate → ParseFundDate`     | intra_community | 3     |

## How to Explore

1. `context({name: "latestEstimatedAt"})` — see callers and callees
2. `query({search_query: "fund-list"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
