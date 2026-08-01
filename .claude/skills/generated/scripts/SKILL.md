---
name: scripts
description: 'Skill for the Scripts area of pure-hold. 51 symbols across 4 files.'
---

# Scripts

51 symbols | 4 files | Cohesion: 84%

## When to Use

- Working with code in `scripts/`
- Understanding how calculateReinvestedNav, isPositiveFiniteNumber, isNonNegativeFiniteNumber work
- Modifying scripts-related functionality

## Key Files

| File                                               | Symbols                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | main, compareFund, compareEventValues, compareDividendRecordDates, sumEventsByDate (+25) |
| `scripts/update-index-definitions.mjs`             | updateIndexDefinitions, formatIndexDefinitions, writeAtomically, randomDelay, sleep (+9) |
| `scripts/check-vue-class-length.mjs`               | findStaticClassViolations, checkVueClassLengths, collectVueFiles, main                   |
| `scripts/fund-reinvest-nav-v3.ts`                  | calculateReinvestedNav, isPositiveFiniteNumber, isNonNegativeFiniteNumber                |

## Entry Points

Start here when exploring this area:

- **`calculateReinvestedNav`** (Function) — `scripts/fund-reinvest-nav-v3.ts:27`
- **`isPositiveFiniteNumber`** (Function) — `scripts/fund-reinvest-nav-v3.ts:100`
- **`isNonNegativeFiniteNumber`** (Function) — `scripts/fund-reinvest-nav-v3.ts:104`
- **`updateIndexDefinitions`** (Function) — `scripts/update-index-definitions.mjs:40`
- **`findStaticClassViolations`** (Function) — `scripts/check-vue-class-length.mjs:9`

## Key Symbols

| Symbol                       | Type     | File                                               | Line |
| ---------------------------- | -------- | -------------------------------------------------- | ---- |
| `calculateReinvestedNav`     | Function | `scripts/fund-reinvest-nav-v3.ts`                  | 27   |
| `isPositiveFiniteNumber`     | Function | `scripts/fund-reinvest-nav-v3.ts`                  | 100  |
| `isNonNegativeFiniteNumber`  | Function | `scripts/fund-reinvest-nav-v3.ts`                  | 104  |
| `updateIndexDefinitions`     | Function | `scripts/update-index-definitions.mjs`             | 40   |
| `findStaticClassViolations`  | Function | `scripts/check-vue-class-length.mjs`               | 9    |
| `checkVueClassLengths`       | Function | `scripts/check-vue-class-length.mjs`               | 44   |
| `parseIndexRankPage`         | Function | `scripts/update-index-definitions.mjs`             | 10   |
| `normalizeIndexDefinitions`  | Function | `scripts/update-index-definitions.mjs`             | 23   |
| `main`                       | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 79   |
| `compareFund`                | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 117  |
| `compareEventValues`         | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 332  |
| `compareDividendRecordDates` | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 353  |
| `sumEventsByDate`            | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 380  |
| `valuesByDate`               | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 393  |
| `tiantianUrl`                | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 496  |
| `shanghaiDate`               | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 533  |
| `formatNumber`               | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 544  |
| `formatOptionalNumber`       | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 548  |
| `parseNetValues`             | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 235  |
| `parseDistribution`          | Function | `scripts/fund-reinvest-nav-v3-lixinger-compare.ts` | 253  |

## Execution Flows

| Flow                                | Type            | Steps |
| ----------------------------------- | --------------- | ----- |
| `Main → IsRecord`                   | cross_community | 5     |
| `Main → ToFiniteNumber`             | cross_community | 5     |
| `UpdateIndexDefinitions → IsRecord` | cross_community | 4     |
| `NormalizeRecord → RequiredString`  | intra_community | 4     |
| `Main → IsDate`                     | cross_community | 4     |
| `Main → FetchJson`                  | cross_community | 3     |
| `Main → TiantianUrl`                | intra_community | 3     |

## How to Explore

1. `context({name: "calculateReinvestedNav"})` — see callers and callees
2. `query({search_query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
