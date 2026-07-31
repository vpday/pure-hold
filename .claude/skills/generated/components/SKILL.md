---
name: components
description: 'Skill for the Components area of pure-hold. 23 symbols across 10 files.'
---

# Components

23 symbols | 10 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how cancelNameEditing, submitName, addGroup work
- Modifying components-related functionality

## Key Files

| File                                                                           | Symbols                                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `src/features/fund-list/components/FundDesktopTable.vue`                       | title, renderQuoteTitle, handleSortChange, isTableSort, shouldShowRowDate (+1) |
| `src/features/fund-group-settings/components/FundGroupList.vue`                | cancelNameEditing, submitName                                                  |
| `src/features/fund-group-settings/composables/useFundGroupDraft.ts`            | addGroup, renameGroup                                                          |
| `src/features/fund-group-settings/models/fundGroupDraft.ts`                    | validateFundGroupName, isFundGroupNameDuplicate                                |
| `src/features/fund-detail/components/FundCumulativeReturnsChart.vue`           | render, themeColor                                                             |
| `src/features/fund-detail/presenters/buildFundCumulativeReturnsChartOption.ts` | buildFundCumulativeReturnsChartOption, buildFundDrawdownOverlay                |
| `src/features/fund-detail/components/FundNetValueChart.vue`                    | render, themeColor                                                             |
| `src/features/index-settings/components/GroupDetail.vue`                       | getDefinition, formatDescription                                               |
| `src/features/index-settings/components/IndexSearchPanel.vue`                  | results, getSearchRank                                                         |
| `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts`          | buildFundNetValueChartOption                                                   |

## Entry Points

Start here when exploring this area:

- **`cancelNameEditing`** (Function) — `src/features/fund-group-settings/components/FundGroupList.vue:63`
- **`submitName`** (Function) — `src/features/fund-group-settings/components/FundGroupList.vue:70`
- **`addGroup`** (Function) — `src/features/fund-group-settings/composables/useFundGroupDraft.ts:52`
- **`renameGroup`** (Function) — `src/features/fund-group-settings/composables/useFundGroupDraft.ts:65`
- **`validateFundGroupName`** (Function) — `src/features/fund-group-settings/models/fundGroupDraft.ts:8`

## Key Symbols

| Symbol                                  | Type     | File                                                                           | Line |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------ | ---- |
| `cancelNameEditing`                     | Function | `src/features/fund-group-settings/components/FundGroupList.vue`                | 63   |
| `submitName`                            | Function | `src/features/fund-group-settings/components/FundGroupList.vue`                | 70   |
| `addGroup`                              | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.ts`            | 52   |
| `renameGroup`                           | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.ts`            | 65   |
| `validateFundGroupName`                 | Function | `src/features/fund-group-settings/models/fundGroupDraft.ts`                    | 8    |
| `isFundGroupNameDuplicate`              | Function | `src/features/fund-group-settings/models/fundGroupDraft.ts`                    | 19   |
| `render`                                | Function | `src/features/fund-detail/components/FundCumulativeReturnsChart.vue`           | 41   |
| `themeColor`                            | Function | `src/features/fund-detail/components/FundCumulativeReturnsChart.vue`           | 58   |
| `buildFundCumulativeReturnsChartOption` | Function | `src/features/fund-detail/presenters/buildFundCumulativeReturnsChartOption.ts` | 32   |
| `render`                                | Function | `src/features/fund-detail/components/FundNetValueChart.vue`                    | 26   |
| `themeColor`                            | Function | `src/features/fund-detail/components/FundNetValueChart.vue`                    | 39   |
| `buildFundNetValueChartOption`          | Function | `src/features/fund-detail/presenters/buildFundNetValueChartOption.ts`          | 17   |
| `title`                                 | Function | `src/features/fund-list/components/FundDesktopTable.vue`                       | 52   |
| `renderQuoteTitle`                      | Function | `src/features/fund-list/components/FundDesktopTable.vue`                       | 103  |
| `handleSortChange`                      | Function | `src/features/fund-list/components/FundDesktopTable.vue`                       | 72   |
| `isTableSort`                           | Function | `src/features/fund-list/components/FundDesktopTable.vue`                       | 83   |
| `shouldShowRowDate`                     | Function | `src/features/fund-list/components/FundDesktopTable.vue`                       | 134  |
| `formatRowDate`                         | Function | `src/features/fund-list/components/FundDesktopTable.vue`                       | 139  |
| `getDefinition`                         | Function | `src/features/index-settings/components/GroupDetail.vue`                       | 33   |
| `formatDescription`                     | Function | `src/features/index-settings/components/GroupDetail.vue`                       | 37   |

## How to Explore

1. `context({name: "cancelNameEditing"})` — see callers and callees
2. `query({search_query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
