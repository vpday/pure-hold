---
name: tiantian
description: "Skill for the Tiantian area of pure-hold. 88 symbols across 28 files."
---

# Tiantian

88 symbols | 28 files | Cohesion: 83%

## When to Use

- Working with code in `src/`
- Understanding how parseTiantianFundHoldingsDisclosureResponse, parseTiantianFundBasicInfoResponse, createTiantianFundCumulativeReturnsRequestUrl work
- Modifying tiantian-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/domains/funds/services/tiantian/parseTiantianFundHoldingsDisclosureResponse.ts` | parseTiantianFundHoldingsDisclosureResponse, normalizeRecords, parseStocks, parseBonds, parseChangeType (+8) |
| `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts` | parseTiantianFundBasicInfoResponse, toText, toTrackingIndex, toFiniteNumber, toNonNegativeNumber (+5) |
| `src/domains/funds/services/tiantian/mapTiantianFundSnapshot.ts` | mapTiantianFundSnapshot, toRequiredString, toNullableString, toNullableNumber, extractTags (+3) |
| `src/domains/funds/services/tiantian/parseTiantianFundNetValueHistoryResponse.ts` | parseTiantianFundNetValueHistoryResponse, mapEvents, toEventType, mapPoint, toNullableNumber (+2) |
| `src/domains/funds/services/tiantian/parseTiantianFundDistributionResponse.ts` | parseTiantianFundDistributionResponse, toRecords, toCategory, toNullableNumber, toNullableDate (+2) |
| `src/domains/funds/services/tiantian/parseTiantianFundCumulativeReturnsResponse.ts` | parseTiantianFundCumulativeReturnsResponse, mapPoint, isValidDate, toNullableYield, toNullableNonNegativeNumber (+1) |
| `src/domains/funds/services/tiantian/parseTiantianFundAssetAllocationResponse.ts` | parseTiantianFundAssetAllocationResponse, mapPoint, hasMismatchedFundCode, isValidDate, toNullableNonNegativeNumber (+1) |
| `src/domains/funds/services/tiantian/fetchTiantianFundHoldingsDisclosure.ts` | fetchTiantianFundHoldingsDisclosure, requestTiantianFundHoldingsDisclosure, extractEtfSource, isRecord, isAbortError |
| `src/domains/funds/services/tiantian/createTiantianFundCumulativeReturnsRequestUrl.ts` | createTiantianFundCumulativeReturnsRequestUrl, assertFundCode |
| `src/domains/funds/services/tiantian/createTiantianFundHoldingsDisclosureRequestUrl.ts` | createTiantianFundHoldingsDisclosureRequestUrl, isValidDate |

## Entry Points

Start here when exploring this area:

- **`parseTiantianFundHoldingsDisclosureResponse`** (Function) — `src/domains/funds/services/tiantian/parseTiantianFundHoldingsDisclosureResponse.ts:16`
- **`parseTiantianFundBasicInfoResponse`** (Function) — `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts:4`
- **`createTiantianFundCumulativeReturnsRequestUrl`** (Function) — `src/domains/funds/services/tiantian/createTiantianFundCumulativeReturnsRequestUrl.ts:5`
- **`fetchTiantianFundCumulativeReturns`** (Function) — `src/domains/funds/services/tiantian/fetchTiantianFundCumulativeReturns.ts:5`
- **`parseTiantianFundCumulativeReturnsResponse`** (Function) — `src/domains/funds/services/tiantian/parseTiantianFundCumulativeReturnsResponse.ts:8`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `parseTiantianFundHoldingsDisclosureResponse` | Function | `src/domains/funds/services/tiantian/parseTiantianFundHoldingsDisclosureResponse.ts` | 16 |
| `parseTiantianFundBasicInfoResponse` | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts` | 4 |
| `createTiantianFundCumulativeReturnsRequestUrl` | Function | `src/domains/funds/services/tiantian/createTiantianFundCumulativeReturnsRequestUrl.ts` | 5 |
| `fetchTiantianFundCumulativeReturns` | Function | `src/domains/funds/services/tiantian/fetchTiantianFundCumulativeReturns.ts` | 5 |
| `parseTiantianFundCumulativeReturnsResponse` | Function | `src/domains/funds/services/tiantian/parseTiantianFundCumulativeReturnsResponse.ts` | 8 |
| `createTiantianFundNetValueHistoryRequestUrl` | Function | `src/domains/funds/services/tiantian/createTiantianFundNetValueHistoryRequestUrl.ts` | 5 |
| `fetchTiantianFundNetValueHistory` | Function | `src/domains/funds/services/tiantian/fetchTiantianFundNetValueHistory.ts` | 5 |
| `parseTiantianFundNetValueHistoryResponse` | Function | `src/domains/funds/services/tiantian/parseTiantianFundNetValueHistoryResponse.ts` | 13 |
| `createTiantianFundAssetAllocationRequestUrl` | Function | `src/domains/funds/services/tiantian/createTiantianFundAssetAllocationRequestUrl.ts` | 4 |
| `fetchTiantianFundAssetAllocation` | Function | `src/domains/funds/services/tiantian/fetchTiantianFundAssetAllocation.ts` | 4 |
| `parseTiantianFundAssetAllocationResponse` | Function | `src/domains/funds/services/tiantian/parseTiantianFundAssetAllocationResponse.ts` | 9 |
| `createTiantianFundHoldingsDisclosureRequestUrl` | Function | `src/domains/funds/services/tiantian/createTiantianFundHoldingsDisclosureRequestUrl.ts` | 4 |
| `fetchTiantianFundHoldingsDisclosure` | Function | `src/domains/funds/services/tiantian/fetchTiantianFundHoldingsDisclosure.ts` | 8 |
| `parseTiantianFundDistributionResponse` | Function | `src/domains/funds/services/tiantian/parseTiantianFundDistributionResponse.ts` | 11 |
| `createTiantianFundBasicInfoRequestBody` | Function | `src/domains/funds/services/tiantian/createTiantianFundBasicInfoRequestBody.ts` | 5 |
| `createTiantianFundDistributionRequestUrl` | Function | `src/domains/funds/services/tiantian/createTiantianFundDistributionRequestUrl.ts` | 4 |
| `createTiantianFundRequestBody` | Function | `src/domains/funds/services/tiantian/createTiantianFundRequestBody.ts` | 5 |
| `createTiantianRequestParams` | Function | `src/domains/funds/services/tiantian/createTiantianRequestParams.ts` | 2 |
| `fetchTiantianFundBasicInfo` | Function | `src/domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts` | 6 |
| `fetchTiantianFundDistribution` | Function | `src/domains/funds/services/tiantian/fetchTiantianFundDistribution.ts` | 4 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ApplySettingsEffect → Read` | cross_community | 8 |
| `RefreshAll → Read` | cross_community | 8 |
| `ApplySettingsEffect → ToRequiredString` | cross_community | 7 |
| `ApplySettingsEffect → IsRecord` | cross_community | 7 |
| `RefreshCodes → Write` | cross_community | 7 |
| `FetchTiantianFundHoldingsDisclosure → Read` | cross_community | 7 |
| `FetchTiantianFundHoldingsDisclosure → Write` | cross_community | 7 |
| `RefreshAll → ToRequiredString` | cross_community | 7 |
| `RefreshAll → IsRecord` | cross_community | 7 |
| `ApplySettingsEffect → ToNullableNumber` | cross_community | 6 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Persistence | 1 calls |

## How to Explore

1. `context({name: "parseTiantianFundHoldingsDisclosureResponse"})` — see callers and callees
2. `query({search_query: "tiantian"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
