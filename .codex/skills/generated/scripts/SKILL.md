---
name: scripts
description: 'Skill for the Scripts area of pure-hold. 18 symbols across 2 files.'
---

# Scripts

18 symbols | 2 files | Cohesion: 89%

## When to Use

- Working with code in `scripts/`
- Understanding how updateIndexDefinitions, findStaticClassViolations, checkVueClassLengths work
- Modifying scripts-related functionality

## Key Files

| File                                   | Symbols                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `scripts/update-index-definitions.mjs` | updateIndexDefinitions, formatIndexDefinitions, writeAtomically, randomDelay, sleep (+9) |
| `scripts/check-vue-class-length.mjs`   | findStaticClassViolations, checkVueClassLengths, collectVueFiles, main                   |

## Entry Points

Start here when exploring this area:

- **`updateIndexDefinitions`** (Function) — `scripts/update-index-definitions.mjs:40`
- **`findStaticClassViolations`** (Function) — `scripts/check-vue-class-length.mjs:9`
- **`checkVueClassLengths`** (Function) — `scripts/check-vue-class-length.mjs:44`
- **`parseIndexRankPage`** (Function) — `scripts/update-index-definitions.mjs:10`
- **`normalizeIndexDefinitions`** (Function) — `scripts/update-index-definitions.mjs:23`

## Key Symbols

| Symbol                      | Type     | File                                   | Line |
| --------------------------- | -------- | -------------------------------------- | ---- |
| `updateIndexDefinitions`    | Function | `scripts/update-index-definitions.mjs` | 40   |
| `findStaticClassViolations` | Function | `scripts/check-vue-class-length.mjs`   | 9    |
| `checkVueClassLengths`      | Function | `scripts/check-vue-class-length.mjs`   | 44   |
| `parseIndexRankPage`        | Function | `scripts/update-index-definitions.mjs` | 10   |
| `normalizeIndexDefinitions` | Function | `scripts/update-index-definitions.mjs` | 23   |
| `formatIndexDefinitions`    | Function | `scripts/update-index-definitions.mjs` | 164  |
| `writeAtomically`           | Function | `scripts/update-index-definitions.mjs` | 211  |
| `randomDelay`               | Function | `scripts/update-index-definitions.mjs` | 223  |
| `sleep`                     | Function | `scripts/update-index-definitions.mjs` | 227  |
| `normalizeRecord`           | Function | `scripts/update-index-definitions.mjs` | 66   |
| `toRefreshMarketCodes`      | Function | `scripts/update-index-definitions.mjs` | 97   |
| `requiredString`            | Function | `scripts/update-index-definitions.mjs` | 137  |
| `nullableString`            | Function | `scripts/update-index-definitions.mjs` | 144  |
| `splitNullableList`         | Function | `scripts/update-index-definitions.mjs` | 151  |
| `collectVueFiles`           | Function | `scripts/check-vue-class-length.mjs`   | 58   |
| `main`                      | Function | `scripts/check-vue-class-length.mjs`   | 75   |
| `fetchPage`                 | Function | `scripts/update-index-definitions.mjs` | 177  |
| `isRecord`                  | Function | `scripts/update-index-definitions.mjs` | 231  |

## Execution Flows

| Flow                                | Type            | Steps |
| ----------------------------------- | --------------- | ----- |
| `UpdateIndexDefinitions → IsRecord` | cross_community | 4     |
| `NormalizeRecord → RequiredString`  | intra_community | 4     |

## How to Explore

1. `context({name: "updateIndexDefinitions"})` — see callers and callees
2. `query({search_query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
