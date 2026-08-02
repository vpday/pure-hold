---
name: models
description: 'Skill for the Models area of pure-hold. 50 symbols across 9 files.'
---

# Models

50 symbols | 9 files | Cohesion: 87%

## When to Use

- Working with code in `src/`
- Understanding how calculateFundReturnMetrics, calculateReturnMetrics, periodReturn work
- Modifying models-related functionality

## Key Files

| File                                                                | Symbols                                                                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domains/funds/models/fundReturnMetrics.ts`                     | calculateFundReturnMetrics, calculateReturnMetrics, periodReturn, annualizedReturn, quarterlyReturns (+14)                            |
| `src/features/fund-detail/models/fundMetricsComparison.ts`          | calculateFundMetricsComparison, calculateRelativeReturn, comparison, comparisonYear, validFundPoints (+4)                             |
| `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | createEmptyFundHoldingDraft, createFundHoldingDraft, validateFundHoldingDraft, purchaseDateFromHoldingDays, parsePositiveDecimal (+2) |
| `src/features/fund-edit/models/fundEditDraft.ts`                    | updateFundGroupMembership, updateFundHolding, submitFundEditDraft, isFundHoldingDraftEmpty, createFundEditDraft                       |
| `src/features/fund-edit/FundEditEntry.vue`                          | open, close, confirm                                                                                                                  |
| `src/features/fund-group-settings/models/fundGroupDraft.ts`         | moveFundGroup, moveFundCode, moveItem                                                                                                 |
| `src/features/fund-group-settings/composables/useFundGroupDraft.ts` | reorderGroups, reorderFunds                                                                                                           |
| `src/features/fund-search/composables/useFundAdditionSession.ts`    | enterHoldings                                                                                                                         |
| `src/features/fund-search/models/fundHoldingDraft.ts`               | createFundHoldingDrafts                                                                                                               |

## Entry Points

Start here when exploring this area:

- **`calculateFundReturnMetrics`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:48`
- **`calculateReturnMetrics`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:56`
- **`periodReturn`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:63`
- **`annualizedReturn`** (Function) — `src/domains/funds/models/fundReturnMetrics.ts:65`
- **`calculateFundMetricsComparison`** (Function) — `src/features/fund-detail/models/fundMetricsComparison.ts:62`

## Key Symbols

| Symbol                           | Type     | File                                                                | Line |
| -------------------------------- | -------- | ------------------------------------------------------------------- | ---- |
| `calculateFundReturnMetrics`     | Function | `src/domains/funds/models/fundReturnMetrics.ts`                     | 48   |
| `calculateReturnMetrics`         | Function | `src/domains/funds/models/fundReturnMetrics.ts`                     | 56   |
| `periodReturn`                   | Function | `src/domains/funds/models/fundReturnMetrics.ts`                     | 63   |
| `annualizedReturn`               | Function | `src/domains/funds/models/fundReturnMetrics.ts`                     | 65   |
| `calculateFundMetricsComparison` | Function | `src/features/fund-detail/models/fundMetricsComparison.ts`          | 62   |
| `calculateRelativeReturn`        | Function | `src/features/fund-detail/models/fundMetricsComparison.ts`          | 123  |
| `open`                           | Function | `src/features/fund-edit/FundEditEntry.vue`                          | 24   |
| `close`                          | Function | `src/features/fund-edit/FundEditEntry.vue`                          | 35   |
| `confirm`                        | Function | `src/features/fund-edit/FundEditEntry.vue`                          | 42   |
| `submitFundEditDraft`            | Function | `src/features/fund-edit/models/fundEditDraft.ts`                    | 44   |
| `createFundEditDraft`            | Function | `src/features/fund-edit/models/fundEditDraft.ts`                    | 28   |
| `createEmptyFundHoldingDraft`    | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 20   |
| `createFundHoldingDraft`         | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 31   |
| `enterHoldings`                  | Function | `src/features/fund-search/composables/useFundAdditionSession.ts`    | 78   |
| `createFundHoldingDrafts`        | Function | `src/features/fund-search/models/fundHoldingDraft.ts`               | 17   |
| `reorderGroups`                  | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.ts` | 94   |
| `reorderFunds`                   | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.ts` | 98   |
| `moveFundGroup`                  | Function | `src/features/fund-group-settings/models/fundGroupDraft.ts`         | 44   |
| `moveFundCode`                   | Function | `src/features/fund-group-settings/models/fundGroupDraft.ts`         | 48   |
| `validateFundHoldingDraft`       | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 42   |

## Execution Flows

| Flow                                                   | Type            | Steps |
| ------------------------------------------------------ | --------------- | ----- |
| `CalculateFundMetricsComparison → UtcDate`             | cross_community | 6     |
| `CalculateFundMetricsComparison → FormatDate`          | intra_community | 5     |
| `CalculateFundMetricsComparison → ReturnBetween`       | intra_community | 5     |
| `CalculateFundMetricsComparison → FindPointAtOrBefore` | intra_community | 5     |
| `CalculateFundMetricsComparison → FindPointInRange`    | intra_community | 5     |
| `Confirm → FormatLocalDate`                            | cross_community | 5     |
| `ConfirmHoldings → FormatLocalDate`                    | cross_community | 5     |
| `CalculateFundMetricsComparison → EmptyMetrics`        | intra_community | 4     |
| `Confirm → ParsePositiveDecimal`                       | cross_community | 4     |
| `Confirm → ValidatePurchaseDate`                       | cross_community | 4     |

## How to Explore

1. `context({name: "calculateFundReturnMetrics"})` — see callers and callees
2. `query({search_query: "models"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
