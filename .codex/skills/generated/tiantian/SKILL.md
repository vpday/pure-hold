---
name: tiantian
description: 'Skill for the Tiantian area of pure-hold. 49 symbols across 16 files.'
---

# Tiantian

49 symbols | 16 files | Cohesion: 82%

## When to Use

- Working with code in `src/`
- Understanding how parseTiantianFundBasicInfoResponse, createTiantianFundBasicInfoRequestBody, createTiantianFundCumulativeReturnsRequestUrl work
- Modifying tiantian-related functionality

## Key Files

| File                                                                                   | Symbols                                                                                                              |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`            | parseTiantianFundBasicInfoResponse, toText, toTrackingIndex, toFiniteNumber, toNonNegativeNumber (+5)                |
| `src/domains/funds/services/tiantian/mapTiantianFundSnapshot.ts`                       | mapTiantianFundSnapshot, toRequiredString, toNullableString, toNullableNumber, extractTags (+3)                      |
| `src/domains/funds/services/tiantian/parseTiantianFundDistributionResponse.ts`         | parseTiantianFundDistributionResponse, toRecords, toCategory, toNullableNumber, toNullableDate (+2)                  |
| `src/domains/funds/services/tiantian/parseTiantianFundCumulativeReturnsResponse.ts`    | parseTiantianFundCumulativeReturnsResponse, mapPoint, isValidDate, toNullableYield, toNullableNonNegativeNumber (+1) |
| `src/domains/funds/services/tiantian/parseTiantianFundNetValueHistoryResponse.ts`      | parseTiantianFundNetValueHistoryResponse, mapPoint, toNullableNumber, isValidDate, isRecord                          |
| `src/domains/funds/services/tiantian/createTiantianFundCumulativeReturnsRequestUrl.ts` | createTiantianFundCumulativeReturnsRequestUrl, assertFundCode                                                        |
| `src/domains/funds/services/tiantian/parseTiantianFundResponse.ts`                     | parseTiantianFundResponse, isRecord                                                                                  |
| `src/domains/funds/services/tiantian/createTiantianFundBasicInfoRequestBody.ts`        | createTiantianFundBasicInfoRequestBody                                                                               |
| `src/domains/funds/services/tiantian/createTiantianFundDistributionRequestUrl.ts`      | createTiantianFundDistributionRequestUrl                                                                             |
| `src/domains/funds/services/tiantian/createTiantianRequestParams.ts`                   | createTiantianRequestParams                                                                                          |

## Entry Points

Start here when exploring this area:

- **`parseTiantianFundBasicInfoResponse`** (Function) — `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts:4`
- **`createTiantianFundBasicInfoRequestBody`** (Function) — `src/domains/funds/services/tiantian/createTiantianFundBasicInfoRequestBody.ts:5`
- **`createTiantianFundCumulativeReturnsRequestUrl`** (Function) — `src/domains/funds/services/tiantian/createTiantianFundCumulativeReturnsRequestUrl.ts:5`
- **`createTiantianFundDistributionRequestUrl`** (Function) — `src/domains/funds/services/tiantian/createTiantianFundDistributionRequestUrl.ts:4`
- **`createTiantianRequestParams`** (Function) — `src/domains/funds/services/tiantian/createTiantianRequestParams.ts:0`

## Key Symbols

| Symbol                                          | Type     | File                                                                                   | Line |
| ----------------------------------------------- | -------- | -------------------------------------------------------------------------------------- | ---- |
| `parseTiantianFundBasicInfoResponse`            | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`            | 4    |
| `createTiantianFundBasicInfoRequestBody`        | Function | `src/domains/funds/services/tiantian/createTiantianFundBasicInfoRequestBody.ts`        | 5    |
| `createTiantianFundCumulativeReturnsRequestUrl` | Function | `src/domains/funds/services/tiantian/createTiantianFundCumulativeReturnsRequestUrl.ts` | 5    |
| `createTiantianFundDistributionRequestUrl`      | Function | `src/domains/funds/services/tiantian/createTiantianFundDistributionRequestUrl.ts`      | 4    |
| `createTiantianRequestParams`                   | Function | `src/domains/funds/services/tiantian/createTiantianRequestParams.ts`                   | 0    |
| `fetchTiantianFundBasicInfo`                    | Function | `src/domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts`                    | 6    |
| `fetchTiantianFundCumulativeReturns`            | Function | `src/domains/funds/services/tiantian/fetchTiantianFundCumulativeReturns.ts`            | 5    |
| `fetchTiantianFundDistribution`                 | Function | `src/domains/funds/services/tiantian/fetchTiantianFundDistribution.ts`                 | 4    |
| `createTiantianFundNetValueHistoryRequestUrl`   | Function | `src/domains/funds/services/tiantian/createTiantianFundNetValueHistoryRequestUrl.ts`   | 5    |
| `fetchTiantianFundNetValueHistory`              | Function | `src/domains/funds/services/tiantian/fetchTiantianFundNetValueHistory.ts`              | 5    |
| `parseTiantianFundNetValueHistoryResponse`      | Function | `src/domains/funds/services/tiantian/parseTiantianFundNetValueHistoryResponse.ts`      | 5    |
| `parseTiantianFundDistributionResponse`         | Function | `src/domains/funds/services/tiantian/parseTiantianFundDistributionResponse.ts`         | 11   |
| `mapTiantianFundSnapshot`                       | Function | `src/domains/funds/services/tiantian/mapTiantianFundSnapshot.ts`                       | 3    |
| `parseTiantianFundResponse`                     | Function | `src/domains/funds/services/tiantian/parseTiantianFundResponse.ts`                     | 11   |
| `isSuccessfulTiantianResponse`                  | Function | `src/domains/funds/services/tiantian/tiantianResponse.ts`                              | 11   |
| `parseTiantianFundCumulativeReturnsResponse`    | Function | `src/domains/funds/services/tiantian/parseTiantianFundCumulativeReturnsResponse.ts`    | 8    |
| `toText`                                        | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`            | 53   |
| `toTrackingIndex`                               | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`            | 61   |
| `toFiniteNumber`                                | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`            | 70   |
| `toNonNegativeNumber`                           | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`            | 78   |

## Execution Flows

| Flow                                            | Type            | Steps |
| ----------------------------------------------- | --------------- | ----- |
| `FetchTiantianFundSnapshots → IsRecord`         | cross_community | 6     |
| `FetchTiantianFundSnapshots → ToNullableNumber` | cross_community | 6     |
| `FetchTiantianFundSnapshots → ToRequiredString` | cross_community | 6     |
| `RefreshAll → ToRequiredString`                 | cross_community | 6     |
| `RefreshAll → ToNullableNumber`                 | cross_community | 6     |
| `AddFunds → CreateTiantianRequestParams`        | cross_community | 5     |
| `AddFunds → IsSuccessfulTiantianResponse`       | cross_community | 5     |
| `RefreshAll → CreateTiantianRequestParams`      | cross_community | 5     |
| `RefreshAll → IsSuccessfulTiantianResponse`     | cross_community | 5     |
| `RefreshAll → IsRecord`                         | cross_community | 5     |

## How to Explore

1. `context({name: "parseTiantianFundBasicInfoResponse"})` — see callers and callees
2. `query({search_query: "tiantian"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
