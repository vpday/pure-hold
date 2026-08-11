---
name: models
description: "Skill for the Models area of pure-hold. 126 symbols across 24 files."
---

# Models

126 symbols | 24 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how calculateFundReturnMetrics, calculateReturnMetrics, periodReturn work
- Modifying models-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/domains/funds/models/fundRiskMetrics.ts` | calculateWindowMetrics, annualizeSampleDeviation, calculateSharpeRatio, calculateSortinoRatio, sampleDeviation (+21) |
| `src/domains/funds/models/fundReturnMetrics.ts` | calculateFundReturnMetrics, calculateReturnMetrics, periodReturn, annualizedReturn, quarterlyReturns (+15) |
| `src/features/fund-detail/models/fundMetricsComparison.ts` | calculateFundMetricsComparison, calculateRelativeReturn, comparison, comparisonYear, quarterEndDate (+5) |
| `src/domains/funds/models/fundHoldingMetrics.ts` | calculateFundHoldingMetrics, incomeFromChangePercent, calendarDayDifference, isoDateToUtcTime, fundDate (+2) |
| `src/features/fund-detail/models/fundReinvestedNavRange.ts` | selectFundReinvestedNavRange, rangeStart, subtractMonths, subtractYears, yearCount (+2) |
| `src/features/fund-detail/models/fundRollingExcessReturn.ts` | calculateFundRollingExcessReturn, emptyResult, monthlyEndpoints, completedMonthCutoff, periodReturn (+2) |
| `src/features/fund-holding-form/models/fundHoldingDraft.ts` | createEmptyFundHoldingDraft, createFundHoldingDraft, validateFundHoldingDraft, purchaseDateFromHoldingDays, parsePositiveDecimal (+2) |
| `src/features/fund-edit/models/fundEditDraft.ts` | updateFundGroupMembership, updateFundHolding, submitFundEditDraft, isFundHoldingDraftEmpty, createFundEditDraft |
| `src/features/fund-detail/models/fundBenchmarkTimeSeriesAlignment.ts` | alignFundBenchmarkTimeSeries, validFundPoints, validBenchmarkPoints, uniqueByDate, isIsoDate |
| `src/features/fund-detail/composables/useFundMetrics.ts` | applyRiskAssumptions, calculateRisk, isValidRatePercent |

## Entry Points

Start here when exploring this area:

- **`calculateFundReturnMetrics`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:48`
- **`calculateReturnMetrics`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:56`
- **`periodReturn`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:63`
- **`annualizedReturn`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:65`
- **`calculateFundMetricsComparison`** (Function) — `src/features/fund-detail/models/fundMetricsComparison.ts:117`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `calculateFundReturnMetrics` | Function | `src/domains/funds/models/fundReturnMetrics.ts` | 48 |
| `calculateReturnMetrics` | Function | `src/domains/funds/models/fundReturnMetrics.ts` | 56 |
| `periodReturn` | Function | `src/domains/funds/models/fundReturnMetrics.ts` | 63 |
| `annualizedReturn` | Function | `src/domains/funds/models/fundReturnMetrics.ts` | 65 |
| `calculateFundMetricsComparison` | Function | `src/features/fund-detail/models/fundMetricsComparison.ts` | 117 |
| `calculateRelativeReturn` | Function | `src/features/fund-detail/models/fundMetricsComparison.ts` | 243 |
| `calculateFundHoldingMetrics` | Function | `src/domains/funds/models/fundHoldingMetrics.ts` | 28 |
| `baseRows` | Function | `src/features/fund-list/FundListSection.vue` | 62 |
| `shanghaiDate` | Function | `src/features/fund-list/FundListSection.vue` | 143 |
| `applyRiskAssumptions` | Function | `src/features/fund-detail/composables/useFundMetrics.ts` | 120 |
| `calculateFundRiskMetricsComparison` | Function | `src/features/fund-detail/models/fundMetricsComparison.ts` | 172 |
| `selectedData` | Function | `src/features/fund-detail/composables/useFundReinvestedNavHistory.ts` | 28 |
| `selectFundReinvestedNavRange` | Function | `src/features/fund-detail/models/fundReinvestedNavRange.ts` | 12 |
| `calculateFundRollingExcessReturn` | Function | `src/features/fund-detail/models/fundRollingExcessReturn.ts` | 38 |
| `submitFundEditDraft` | Function | `src/features/fund-edit/models/fundEditDraft.ts` | 44 |
| `open` | Function | `src/features/fund-edit/FundEditEntry.vue` | 24 |
| `close` | Function | `src/features/fund-edit/FundEditEntry.vue` | 35 |
| `confirm` | Function | `src/features/fund-edit/FundEditEntry.vue` | 42 |
| `calculateRollingFundRiskMetrics` | Function | `src/domains/funds/models/fundRiskMetrics.ts` | 46 |
| `selectRange` | Function | `src/features/fund-detail/composables/useFundCumulativeExcessReturn.ts` | 57 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ApplyRiskAssumptions → UtcDate` | cross_community | 8 |
| `ApplyRiskAssumptions → FormatDate` | cross_community | 7 |
| `Activate → UniqueByDate` | cross_community | 7 |
| `Activate → IsIsoDate` | cross_community | 7 |
| `Activate → FormatDate` | cross_community | 7 |
| `CalculateFundRollingExcessReturn → DaysInMonth` | cross_community | 6 |
| `CalculateWindowMetrics → UtcDate` | cross_community | 6 |
| `ApplyRiskAssumptions → UniqueByDate` | cross_community | 6 |
| `ApplyRiskAssumptions → IsIsoDate` | cross_community | 6 |
| `Activate → SourceIssues` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Presenters | 1 calls |

## How to Explore

1. `context({name: "calculateFundReturnMetrics"})` — see callers and callees
2. `query({search_query: "models"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
