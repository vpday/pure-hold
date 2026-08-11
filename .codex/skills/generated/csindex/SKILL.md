---
name: csindex
description: "Skill for the Csindex area of pure-hold. 8 symbols across 3 files."
---

# Csindex

8 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how createCsindexPerformanceRequestUrl, fetchCsindexPerformanceHistory, parseCsindexPerformanceResponse work
- Modifying csindex-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/domains/indices/services/csindex/parseCsindexPerformanceResponse.ts` | parseCsindexPerformanceResponse, compactToIso, toIsoDate, toPositiveNumber, isRecord |
| `src/domains/indices/services/csindex/createCsindexPerformanceRequestUrl.ts` | createCsindexPerformanceRequestUrl, isCompactDate |
| `src/domains/indices/services/csindex/fetchCsindexPerformanceHistory.ts` | fetchCsindexPerformanceHistory |

## Entry Points

Start here when exploring this area:

- **`createCsindexPerformanceRequestUrl`** (Function) — `src/domains/indices/services/csindex/createCsindexPerformanceRequestUrl.ts:8`
- **`fetchCsindexPerformanceHistory`** (Function) — `src/domains/indices/services/csindex/fetchCsindexPerformanceHistory.ts:6`
- **`parseCsindexPerformanceResponse`** (Function) — `src/domains/indices/services/csindex/parseCsindexPerformanceResponse.ts:9`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createCsindexPerformanceRequestUrl` | Function | `src/domains/indices/services/csindex/createCsindexPerformanceRequestUrl.ts` | 8 |
| `fetchCsindexPerformanceHistory` | Function | `src/domains/indices/services/csindex/fetchCsindexPerformanceHistory.ts` | 6 |
| `parseCsindexPerformanceResponse` | Function | `src/domains/indices/services/csindex/parseCsindexPerformanceResponse.ts` | 9 |
| `isCompactDate` | Function | `src/domains/indices/services/csindex/createCsindexPerformanceRequestUrl.ts` | 32 |
| `compactToIso` | Function | `src/domains/indices/services/csindex/parseCsindexPerformanceResponse.ts` | 74 |
| `toIsoDate` | Function | `src/domains/indices/services/csindex/parseCsindexPerformanceResponse.ts` | 78 |
| `toPositiveNumber` | Function | `src/domains/indices/services/csindex/parseCsindexPerformanceResponse.ts` | 85 |
| `isRecord` | Function | `src/domains/indices/services/csindex/parseCsindexPerformanceResponse.ts` | 91 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `FetchCsindexPerformanceHistory → CompactToIso` | intra_community | 4 |

## How to Explore

1. `context({name: "createCsindexPerformanceRequestUrl"})` — see callers and callees
2. `query({search_query: "csindex"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
