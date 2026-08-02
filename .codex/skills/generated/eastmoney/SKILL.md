---
name: eastmoney
description: 'Skill for the Eastmoney area of pure-hold. 13 symbols across 7 files.'
---

# Eastmoney

13 symbols | 7 files | Cohesion: 92%

## When to Use

- Working with code in `src/`
- Understanding how createEastmoneyQuoteRequestUrl, fetchEastmoneyIndexQuotes, mapEastmoneyIndexQuote work
- Modifying eastmoney-related functionality

## Key Files

| File                                                                          | Symbols                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/domains/indices/services/eastmoney/mapEastmoneyIndexQuote.ts`            | mapEastmoneyIndexQuote, issue, toFiniteNumber          |
| `src/domains/indices/services/eastmoney/parseEastmoneyIndexQuoteResponse.ts`  | parseEastmoneyIndexQuoteResponse, isCodePart, isRecord |
| `src/domains/funds/services/eastmoney/parseEastmoneyFundSearchResponse.ts`    | parseEastmoneyFundSearchResponse, mapRecord, isRecord  |
| `src/domains/indices/services/eastmoney/createEastmoneyQuoteRequestUrl.ts`    | createEastmoneyQuoteRequestUrl                         |
| `src/domains/indices/services/eastmoney/fetchEastmoneyIndexQuotes.ts`         | fetchEastmoneyIndexQuotes                              |
| `src/domains/funds/services/eastmoney/createEastmoneyFundSearchRequestUrl.ts` | createEastmoneyFundSearchRequestUrl                    |
| `src/domains/funds/services/eastmoney/fetchEastmoneyFundSearchPage.ts`        | fetchEastmoneyFundSearchPage                           |

## Entry Points

Start here when exploring this area:

- **`createEastmoneyQuoteRequestUrl`** (Function) — `src/domains/indices/services/eastmoney/createEastmoneyQuoteRequestUrl.ts:4`
- **`fetchEastmoneyIndexQuotes`** (Function) — `src/domains/indices/services/eastmoney/fetchEastmoneyIndexQuotes.ts:9`
- **`mapEastmoneyIndexQuote`** (Function) — `src/domains/indices/services/eastmoney/mapEastmoneyIndexQuote.ts:9`
- **`parseEastmoneyIndexQuoteResponse`** (Function) — `src/domains/indices/services/eastmoney/parseEastmoneyIndexQuoteResponse.ts:2`
- **`createEastmoneyFundSearchRequestUrl`** (Function) — `src/domains/funds/services/eastmoney/createEastmoneyFundSearchRequestUrl.ts:2`

## Key Symbols

| Symbol                                | Type     | File                                                                          | Line |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------- | ---- |
| `createEastmoneyQuoteRequestUrl`      | Function | `src/domains/indices/services/eastmoney/createEastmoneyQuoteRequestUrl.ts`    | 4    |
| `fetchEastmoneyIndexQuotes`           | Function | `src/domains/indices/services/eastmoney/fetchEastmoneyIndexQuotes.ts`         | 9    |
| `mapEastmoneyIndexQuote`              | Function | `src/domains/indices/services/eastmoney/mapEastmoneyIndexQuote.ts`            | 9    |
| `parseEastmoneyIndexQuoteResponse`    | Function | `src/domains/indices/services/eastmoney/parseEastmoneyIndexQuoteResponse.ts`  | 2    |
| `createEastmoneyFundSearchRequestUrl` | Function | `src/domains/funds/services/eastmoney/createEastmoneyFundSearchRequestUrl.ts` | 2    |
| `fetchEastmoneyFundSearchPage`        | Function | `src/domains/funds/services/eastmoney/fetchEastmoneyFundSearchPage.ts`        | 6    |
| `parseEastmoneyFundSearchResponse`    | Function | `src/domains/funds/services/eastmoney/parseEastmoneyFundSearchResponse.ts`    | 6    |
| `issue`                               | Function | `src/domains/indices/services/eastmoney/mapEastmoneyIndexQuote.ts`            | 48   |
| `toFiniteNumber`                      | Function | `src/domains/indices/services/eastmoney/mapEastmoneyIndexQuote.ts`            | 52   |
| `isCodePart`                          | Function | `src/domains/indices/services/eastmoney/parseEastmoneyIndexQuoteResponse.ts`  | 35   |
| `isRecord`                            | Function | `src/domains/indices/services/eastmoney/parseEastmoneyIndexQuoteResponse.ts`  | 42   |
| `mapRecord`                           | Function | `src/domains/funds/services/eastmoney/parseEastmoneyFundSearchResponse.ts`    | 38   |
| `isRecord`                            | Function | `src/domains/funds/services/eastmoney/parseEastmoneyFundSearchResponse.ts`    | 47   |

## Execution Flows

| Flow                                                   | Type            | Steps |
| ------------------------------------------------------ | --------------- | ----- |
| `HandleStorageChange → IsRecord`                       | cross_community | 7     |
| `HandleStorageChange → IsCodePart`                     | cross_community | 7     |
| `StartPolling → CreateEastmoneyQuoteRequestUrl`        | cross_community | 7     |
| `SyncFromStorage → Issue`                              | cross_community | 6     |
| `HandleStorageChange → CreateEastmoneyQuoteRequestUrl` | cross_community | 6     |
| `ReplaceGroups → ToFiniteNumber`                       | cross_community | 5     |
| `RefreshVisibleQuotes → IsRecord`                      | cross_community | 5     |
| `RefreshVisibleQuotes → IsCodePart`                    | cross_community | 5     |
| `RefreshVisibleQuotes → Issue`                         | cross_community | 5     |
| `RefreshVisibleQuotes → ToFiniteNumber`                | cross_community | 5     |

## How to Explore

1. `context({name: "createEastmoneyQuoteRequestUrl"})` — see callers and callees
2. `query({search_query: "eastmoney"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
