---
name: cluster-126
description: 'Skill for the Cluster_126 area of pure-hold. 4 symbols across 1 files.'
---

# Cluster_126

4 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how handleApiRequest, readCachedAt, storeApiResponse work
- Modifying cluster_126-related functionality

## Key Files

| File        | Symbols                                                         |
| ----------- | --------------------------------------------------------------- |
| `src/sw.ts` | handleApiRequest, readCachedAt, storeApiResponse, pruneApiCache |

## Key Symbols

| Symbol             | Type     | File        | Line |
| ------------------ | -------- | ----------- | ---- |
| `handleApiRequest` | Function | `src/sw.ts` | 76   |
| `readCachedAt`     | Function | `src/sw.ts` | 109  |
| `storeApiResponse` | Function | `src/sw.ts` | 119  |
| `pruneApiCache`    | Function | `src/sw.ts` | 133  |

## How to Explore

1. `context({name: "handleApiRequest"})` — see callers and callees
2. `query({search_query: "cluster_126"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
