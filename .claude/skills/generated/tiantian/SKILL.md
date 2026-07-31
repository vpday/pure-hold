---
name: tiantian
description: 'Skill for the Tiantian area of pure-hold. 42 symbols across 13 files.'
---

# Tiantian

42 symbols | 13 files | Cohesion: 93%

## When to Use

- Working with code in `src/`
- Understanding how createTiantianFundBasicInfoRequestBody, fetchTiantianFundBasicInfo, parseTiantianFundBasicInfoResponse work
- Modifying tiantian-related functionality

## Key Files

| File                                                                                 | Symbols                                                                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | parseTiantianFundBasicInfoResponse, isSuccessfulResponse, toText, toTrackingIndex, toFiniteNumber (+6) |
| `src/domains/funds/services/tiantian/mapTiantianFundSnapshot.ts`                     | mapTiantianFundSnapshot, toRequiredString, toNullableString, toNullableNumber, extractTags (+3)        |
| `src/domains/funds/services/tiantian/parseTiantianFundDistributionResponse.ts`       | parseTiantianFundDistributionResponse, toRecords, toCategory, toNullableNumber, toNullableDate (+2)    |
| `src/domains/funds/services/tiantian/parseTiantianFundNetValueHistoryResponse.ts`    | parseTiantianFundNetValueHistoryResponse, mapPoint, toNullableNumber, isValidDate, isRecord            |
| `src/domains/funds/services/tiantian/parseTiantianFundResponse.ts`                   | parseTiantianFundResponse, isSuccessfulResponse, isRecord                                              |
| `src/domains/funds/services/tiantian/createTiantianFundBasicInfoRequestBody.ts`      | createTiantianFundBasicInfoRequestBody                                                                 |
| `src/domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts`                  | fetchTiantianFundBasicInfo                                                                             |
| `src/domains/funds/services/tiantian/createTiantianFundDistributionRequestUrl.ts`    | createTiantianFundDistributionRequestUrl                                                               |
| `src/domains/funds/services/tiantian/fetchTiantianFundDistribution.ts`               | fetchTiantianFundDistribution                                                                          |
| `src/domains/funds/services/tiantian/createTiantianFundNetValueHistoryRequestUrl.ts` | createTiantianFundNetValueHistoryRequestUrl                                                            |

## Entry Points

Start here when exploring this area:

- **`createTiantianFundBasicInfoRequestBody`** (Function) — `src/domains/funds/services/tiantian/createTiantianFundBasicInfoRequestBody.ts:3`
- **`fetchTiantianFundBasicInfo`** (Function) — `src/domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts:6`
- **`parseTiantianFundBasicInfoResponse`** (Function) — `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts:6`
- **`createTiantianFundDistributionRequestUrl`** (Function) — `src/domains/funds/services/tiantian/createTiantianFundDistributionRequestUrl.ts:2`
- **`fetchTiantianFundDistribution`** (Function) — `src/domains/funds/services/tiantian/fetchTiantianFundDistribution.ts:4`

## Key Symbols

| Symbol                                        | Type     | File                                                                                 | Line |
| --------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | ---- |
| `createTiantianFundBasicInfoRequestBody`      | Function | `src/domains/funds/services/tiantian/createTiantianFundBasicInfoRequestBody.ts`      | 3    |
| `fetchTiantianFundBasicInfo`                  | Function | `src/domains/funds/services/tiantian/fetchTiantianFundBasicInfo.ts`                  | 6    |
| `parseTiantianFundBasicInfoResponse`          | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 6    |
| `createTiantianFundDistributionRequestUrl`    | Function | `src/domains/funds/services/tiantian/createTiantianFundDistributionRequestUrl.ts`    | 2    |
| `fetchTiantianFundDistribution`               | Function | `src/domains/funds/services/tiantian/fetchTiantianFundDistribution.ts`               | 4    |
| `parseTiantianFundDistributionResponse`       | Function | `src/domains/funds/services/tiantian/parseTiantianFundDistributionResponse.ts`       | 10   |
| `createTiantianFundNetValueHistoryRequestUrl` | Function | `src/domains/funds/services/tiantian/createTiantianFundNetValueHistoryRequestUrl.ts` | 4    |
| `fetchTiantianFundNetValueHistory`            | Function | `src/domains/funds/services/tiantian/fetchTiantianFundNetValueHistory.ts`            | 5    |
| `parseTiantianFundNetValueHistoryResponse`    | Function | `src/domains/funds/services/tiantian/parseTiantianFundNetValueHistoryResponse.ts`    | 7    |
| `createTiantianFundRequestBody`               | Function | `src/domains/funds/services/tiantian/createTiantianFundRequestBody.ts`               | 3    |
| `fetchTiantianFundSnapshots`                  | Function | `src/domains/funds/services/tiantian/fetchTiantianFundSnapshots.ts`                  | 14   |
| `parseTiantianFundResponse`                   | Function | `src/domains/funds/services/tiantian/parseTiantianFundResponse.ts`                   | 10   |
| `mapTiantianFundSnapshot`                     | Function | `src/domains/funds/services/tiantian/mapTiantianFundSnapshot.ts`                     | 3    |
| `isSuccessfulResponse`                        | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 51   |
| `toText`                                      | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 65   |
| `toTrackingIndex`                             | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 73   |
| `toFiniteNumber`                              | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 82   |
| `toNonNegativeNumber`                         | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 90   |
| `toPositiveNumber`                            | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 95   |
| `toNonNegativeInteger`                        | Function | `src/domains/funds/services/tiantian/parseTiantianFundBasicInfoResponse.ts`          | 100  |

## Execution Flows

| Flow                                            | Type            | Steps |
| ----------------------------------------------- | --------------- | ----- |
| `FetchTiantianFundSnapshots → IsRecord`         | cross_community | 6     |
| `FetchTiantianFundSnapshots → ToNullableNumber` | cross_community | 6     |
| `FetchTiantianFundSnapshots → ToRequiredString` | cross_community | 6     |
| `RefreshAll → IsRecord`                         | cross_community | 6     |
| `RefreshAll → ToRequiredString`                 | cross_community | 6     |
| `RefreshAll → ToNullableNumber`                 | cross_community | 6     |
| `AddFunds → IsRecord`                           | cross_community | 5     |
| `AddFunds → CreateTiantianFundRequestBody`      | cross_community | 4     |
| `FetchTiantianFundBasicInfo → IsRecord`         | intra_community | 4     |
| `FetchTiantianFundBasicInfo → ToText`           | intra_community | 4     |

## How to Explore

1. `context({name: "createTiantianFundBasicInfoRequestBody"})` — see callers and callees
2. `query({search_query: "tiantian"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
