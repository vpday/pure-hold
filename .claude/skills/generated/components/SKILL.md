---
name: components
description: 'Skill for the Components area of pure-hold. 13 symbols across 5 files.'
---

# Components

13 symbols | 5 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how buildFundNetValueChartOption, render, themeColor work
- Modifying components-related functionality

## Key Files

| File                                                                  | Symbols                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/features/fund-list/components/FundDesktopTable.vue`              | title, renderQuoteTitle, handleSortChange, isTableSort, shouldShowRowDate (+1) |
| `src/features/fund-detail/components/FundNetValueChart.vue`           | render, themeColor                                                             |
| `src/features/index-settings/components/GroupDetail.vue`              | getDefinition, formatDescription                                               |
| `src/features/index-settings/components/IndexSearchPanel.vue`         | results, getSearchRank                                                         |
| `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts` | buildFundNetValueChartOption                                                   |

## Entry Points

Start here when exploring this area:

- **`buildFundNetValueChartOption`** (Function) — `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts:17`
- **`render`** (Function) — `src/features/fund-detail/components/FundNetValueChart.vue:26`
- **`themeColor`** (Function) — `src/features/fund-detail/components/FundNetValueChart.vue:39`
- **`title`** (Function) — `src/features/fund-list/components/FundDesktopTable.vue:52`
- **`renderQuoteTitle`** (Function) — `src/features/fund-list/components/FundDesktopTable.vue:103`

## Key Symbols

| Symbol                         | Type     | File                                                                  | Line |
| ------------------------------ | -------- | --------------------------------------------------------------------- | ---- |
| `buildFundNetValueChartOption` | Function | `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts` | 17   |
| `render`                       | Function | `src/features/fund-detail/components/FundNetValueChart.vue`           | 26   |
| `themeColor`                   | Function | `src/features/fund-detail/components/FundNetValueChart.vue`           | 39   |
| `title`                        | Function | `src/features/fund-list/components/FundDesktopTable.vue`              | 52   |
| `renderQuoteTitle`             | Function | `src/features/fund-list/components/FundDesktopTable.vue`              | 103  |
| `handleSortChange`             | Function | `src/features/fund-list/components/FundDesktopTable.vue`              | 72   |
| `isTableSort`                  | Function | `src/features/fund-list/components/FundDesktopTable.vue`              | 83   |
| `shouldShowRowDate`            | Function | `src/features/fund-list/components/FundDesktopTable.vue`              | 134  |
| `formatRowDate`                | Function | `src/features/fund-list/components/FundDesktopTable.vue`              | 139  |
| `getDefinition`                | Function | `src/features/index-settings/components/GroupDetail.vue`              | 33   |
| `formatDescription`            | Function | `src/features/index-settings/components/GroupDetail.vue`              | 37   |
| `results`                      | Function | `src/features/index-settings/components/IndexSearchPanel.vue`         | 17   |
| `getSearchRank`                | Function | `src/features/index-settings/components/IndexSearchPanel.vue`         | 49   |

## How to Explore

1. `context({name: "buildFundNetValueChartOption"})` — see callers and callees
2. `query({search_query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
