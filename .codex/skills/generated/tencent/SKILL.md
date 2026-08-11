---
name: tencent
description: "Skill for the Tencent area of pure-hold. 7 symbols across 3 files."
---

# Tencent

7 symbols | 3 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how createTencentFundHoldingQuotesRequestUrl, fetchTencentFundHoldingQuotes, parseTencentFundHoldingQuotesResponse work
- Modifying tencent-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/domains/funds/services/tencent/createTencentFundHoldingQuotesRequestUrl.ts` | createTencentFundHoldingQuotesRequestUrl, isMarket, isQuoteCode |
| `src/domains/funds/services/tencent/parseTencentFundHoldingQuotesResponse.ts` | parseTencentFundHoldingQuotesResponse, matchesQuoteCode, parseNumber |
| `src/domains/funds/services/tencent/fetchTencentFundHoldingQuotes.ts` | fetchTencentFundHoldingQuotes |

## Entry Points

Start here when exploring this area:

- **`createTencentFundHoldingQuotesRequestUrl`** (Function) — `src/domains/funds/services/tencent/createTencentFundHoldingQuotesRequestUrl.ts:4`
- **`fetchTencentFundHoldingQuotes`** (Function) — `src/domains/funds/services/tencent/fetchTencentFundHoldingQuotes.ts:6`
- **`parseTencentFundHoldingQuotesResponse`** (Function) — `src/domains/funds/services/tencent/parseTencentFundHoldingQuotesResponse.ts:4`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `createTencentFundHoldingQuotesRequestUrl` | Function | `src/domains/funds/services/tencent/createTencentFundHoldingQuotesRequestUrl.ts` | 4 |
| `fetchTencentFundHoldingQuotes` | Function | `src/domains/funds/services/tencent/fetchTencentFundHoldingQuotes.ts` | 6 |
| `parseTencentFundHoldingQuotesResponse` | Function | `src/domains/funds/services/tencent/parseTencentFundHoldingQuotesResponse.ts` | 4 |
| `isMarket` | Function | `src/domains/funds/services/tencent/createTencentFundHoldingQuotesRequestUrl.ts` | 29 |
| `isQuoteCode` | Function | `src/domains/funds/services/tencent/createTencentFundHoldingQuotesRequestUrl.ts` | 33 |
| `matchesQuoteCode` | Function | `src/domains/funds/services/tencent/parseTencentFundHoldingQuotesResponse.ts` | 30 |
| `parseNumber` | Function | `src/domains/funds/services/tencent/parseTencentFundHoldingQuotesResponse.ts` | 40 |

## How to Explore

1. `context({name: "createTencentFundHoldingQuotesRequestUrl"})` — see callers and callees
2. `query({search_query: "tencent"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
