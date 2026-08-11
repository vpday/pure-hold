---
name: components
description: "Skill for the Components area of pure-hold. 44 symbols across 17 files."
---

# Components

44 symbols | 17 files | Cohesion: 97%

## When to Use

- Working with code in `src/`
- Understanding how render, syncChart, themeColor work
- Modifying components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/features/fund-detail/components/FundNetValueChart.vue` | render, disposeChart, observeContainer, syncChart, themeColor |
| `src/features/fund-list/components/FundDesktopTable.vue` | handleDataChange, handleSortChange, isTableSort, title, renderQuoteTitle |
| `src/features/fund-detail/components/FundCumulativeExcessReturnChart.vue` | render, syncChart, themeColor |
| `src/features/fund-detail/components/FundCumulativeReturnsChart.vue` | render, syncChart, themeColor |
| `src/features/fund-detail/components/FundDrawdownComparisonChart.vue` | render, syncChart, themeColor |
| `src/features/fund-detail/components/FundMetricsSection.vue` | renderCalendarChart, disposeCalendarChart, syncCalendarChart |
| `src/features/fund-detail/components/FundRollingExcessReturnChart.vue` | render, syncChart, themeColor |
| `src/features/fund-detail/components/FundAssetAllocationChart.vue` | render, syncChart, themeColor |
| `src/features/fund-detail/presenters/buildFundCumulativeExcessReturnChartOption.ts` | buildFundCumulativeExcessReturnChartOption, symmetricMaximum |
| `src/features/fund-detail/presenters/buildFundCumulativeReturnsChartOption.ts` | buildFundCumulativeReturnsChartOption, buildFundDrawdownOverlay |

## Entry Points

Start here when exploring this area:

- **`render`** (Function) — `src/features/fund-detail/components/FundCumulativeExcessReturnChart.vue:37`
- **`syncChart`** (Function) — `src/features/fund-detail/components/FundCumulativeExcessReturnChart.vue:50`
- **`themeColor`** (Function) — `src/features/fund-detail/components/FundCumulativeExcessReturnChart.vue:60`
- **`buildFundCumulativeExcessReturnChartOption`** (Function) — `src/features/fund-detail/presenters/buildFundCumulativeExcessReturnChartOption.ts:21`
- **`render`** (Function) — `src/features/fund-detail/components/FundCumulativeReturnsChart.vue:41`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `render` | Function | `src/features/fund-detail/components/FundCumulativeExcessReturnChart.vue` | 37 |
| `syncChart` | Function | `src/features/fund-detail/components/FundCumulativeExcessReturnChart.vue` | 50 |
| `themeColor` | Function | `src/features/fund-detail/components/FundCumulativeExcessReturnChart.vue` | 60 |
| `buildFundCumulativeExcessReturnChartOption` | Function | `src/features/fund-detail/presenters/buildFundCumulativeExcessReturnChartOption.ts` | 21 |
| `render` | Function | `src/features/fund-detail/components/FundCumulativeReturnsChart.vue` | 41 |
| `syncChart` | Function | `src/features/fund-detail/components/FundCumulativeReturnsChart.vue` | 58 |
| `themeColor` | Function | `src/features/fund-detail/components/FundCumulativeReturnsChart.vue` | 68 |
| `buildFundCumulativeReturnsChartOption` | Function | `src/features/fund-detail/presenters/buildFundCumulativeReturnsChartOption.ts` | 32 |
| `render` | Function | `src/features/fund-detail/components/FundDrawdownComparisonChart.vue` | 37 |
| `syncChart` | Function | `src/features/fund-detail/components/FundDrawdownComparisonChart.vue` | 52 |
| `themeColor` | Function | `src/features/fund-detail/components/FundDrawdownComparisonChart.vue` | 62 |
| `buildFundDrawdownComparisonChartOption` | Function | `src/features/fund-detail/presenters/buildFundDrawdownComparisonChartOption.ts` | 23 |
| `renderCalendarChart` | Function | `src/features/fund-detail/components/FundMetricsSection.vue` | 112 |
| `disposeCalendarChart` | Function | `src/features/fund-detail/components/FundMetricsSection.vue` | 118 |
| `syncCalendarChart` | Function | `src/features/fund-detail/components/FundMetricsSection.vue` | 129 |
| `buildFundCalendarReturnsChartOption` | Function | `src/features/fund-detail/presenters/buildFundCalendarReturnsChartOption.ts` | 14 |
| `render` | Function | `src/features/fund-detail/components/FundNetValueChart.vue` | 39 |
| `disposeChart` | Function | `src/features/fund-detail/components/FundNetValueChart.vue` | 54 |
| `observeContainer` | Function | `src/features/fund-detail/components/FundNetValueChart.vue` | 61 |
| `syncChart` | Function | `src/features/fund-detail/components/FundNetValueChart.vue` | 67 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SyncChart → EventName` | cross_community | 5 |
| `SyncCalendarChart → PercentValue` | intra_community | 4 |
| `SyncChart → EventNames` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Presenters | 1 calls |

## How to Explore

1. `context({name: "render"})` — see callers and callees
2. `query({search_query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
