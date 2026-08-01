---
name: models
description: 'Skill for the Models area of pure-hold. 22 symbols across 7 files.'
---

# Models

22 symbols | 7 files | Cohesion: 88%

## When to Use

- Working with code in `src/`
- Understanding how submitFundEditDraft, open, close work
- Modifying models-related functionality

## Key Files

| File                                                                | Symbols                                                                                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | createEmptyFundHoldingDraft, createFundHoldingDraft, validateFundHoldingDraft, purchaseDateFromHoldingDays, parsePositiveDecimal (+2) |
| `src/features/fund-edit/models/fundEditDraft.ts`                    | updateFundGroupMembership, updateFundHolding, submitFundEditDraft, isFundHoldingDraftEmpty, createFundEditDraft                       |
| `src/features/fund-edit/FundEditEntry.vue`                          | open, close, confirm                                                                                                                  |
| `src/features/fund-group-settings/models/fundGroupDraft.ts`         | moveFundGroup, moveFundCode, moveItem                                                                                                 |
| `src/features/fund-group-settings/composables/useFundGroupDraft.ts` | reorderGroups, reorderFunds                                                                                                           |
| `src/features/fund-search/composables/useFundAdditionSession.ts`    | enterHoldings                                                                                                                         |
| `src/features/fund-search/models/fundHoldingDraft.ts`               | createFundHoldingDrafts                                                                                                               |

## Entry Points

Start here when exploring this area:

- **`submitFundEditDraft`** (Function) — `src/features/fund-edit/models/fundEditDraft.ts:44`
- **`open`** (Function) — `src/features/fund-edit/FundEditEntry.vue:24`
- **`close`** (Function) — `src/features/fund-edit/FundEditEntry.vue:35`
- **`confirm`** (Function) — `src/features/fund-edit/FundEditEntry.vue:42`
- **`createFundEditDraft`** (Function) — `src/features/fund-edit/models/fundEditDraft.ts:28`

## Key Symbols

| Symbol                        | Type     | File                                                                | Line |
| ----------------------------- | -------- | ------------------------------------------------------------------- | ---- |
| `submitFundEditDraft`         | Function | `src/features/fund-edit/models/fundEditDraft.ts`                    | 44   |
| `open`                        | Function | `src/features/fund-edit/FundEditEntry.vue`                          | 24   |
| `close`                       | Function | `src/features/fund-edit/FundEditEntry.vue`                          | 35   |
| `confirm`                     | Function | `src/features/fund-edit/FundEditEntry.vue`                          | 42   |
| `createFundEditDraft`         | Function | `src/features/fund-edit/models/fundEditDraft.ts`                    | 28   |
| `createEmptyFundHoldingDraft` | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 20   |
| `createFundHoldingDraft`      | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 31   |
| `enterHoldings`               | Function | `src/features/fund-search/composables/useFundAdditionSession.ts`    | 78   |
| `createFundHoldingDrafts`     | Function | `src/features/fund-search/models/fundHoldingDraft.ts`               | 17   |
| `reorderGroups`               | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.ts` | 94   |
| `reorderFunds`                | Function | `src/features/fund-group-settings/composables/useFundGroupDraft.ts` | 98   |
| `moveFundGroup`               | Function | `src/features/fund-group-settings/models/fundGroupDraft.ts`         | 44   |
| `moveFundCode`                | Function | `src/features/fund-group-settings/models/fundGroupDraft.ts`         | 48   |
| `validateFundHoldingDraft`    | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 42   |
| `purchaseDateFromHoldingDays` | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 84   |
| `updateFundGroupMembership`   | Method   | `src/features/fund-edit/models/fundEditDraft.ts`                    | 18   |
| `updateFundHolding`           | Method   | `src/features/fund-edit/models/fundEditDraft.ts`                    | 19   |
| `isFundHoldingDraftEmpty`     | Function | `src/features/fund-edit/models/fundEditDraft.ts`                    | 77   |
| `moveItem`                    | Function | `src/features/fund-group-settings/models/fundGroupDraft.ts`         | 52   |
| `parsePositiveDecimal`        | Function | `src/features/fund-holding-form/models/fundHoldingDraft.ts`         | 91   |

## Execution Flows

| Flow                                     | Type            | Steps |
| ---------------------------------------- | --------------- | ----- |
| `ConfirmHoldings → FormatLocalDate`      | cross_community | 5     |
| `Confirm → FormatLocalDate`              | cross_community | 5     |
| `ConfirmHoldings → ParsePositiveDecimal` | cross_community | 4     |
| `ConfirmHoldings → ValidatePurchaseDate` | cross_community | 4     |
| `Confirm → ParsePositiveDecimal`         | cross_community | 4     |
| `Confirm → ValidatePurchaseDate`         | cross_community | 4     |
| `Open → CreateFundHoldingDraft`          | cross_community | 3     |
| `Open → CreateEmptyFundHoldingDraft`     | cross_community | 3     |
| `Confirm → UpdateFundHolding`            | intra_community | 3     |
| `Confirm → UpdateFundGroupMembership`    | intra_community | 3     |

## How to Explore

1. `context({name: "submitFundEditDraft"})` — see callers and callees
2. `query({search_query: "models"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
