---
name: cluster-258
description: "Skill for the Cluster_258 area of pure-hold. 7 symbols across 1 files."
---

# Cluster_258

7 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how waitUntil, respondWith, claim work
- Modifying cluster_258-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/sw.ts` | waitUntil, respondWith, claim, skipWaiting, addEventListener (+2) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `initializeServiceWorker` | Function | `src/sw.ts` | 49 |
| `isSkipWaitingMessage` | Function | `src/sw.ts` | 73 |
| `waitUntil` | Method | `src/sw.ts` | 18 |
| `respondWith` | Method | `src/sw.ts` | 23 |
| `claim` | Method | `src/sw.ts` | 33 |
| `skipWaiting` | Method | `src/sw.ts` | 35 |
| `addEventListener` | Method | `src/sw.ts` | 36 |

## How to Explore

1. `context({name: "waitUntil"})` — see callers and callees
2. `query({search_query: "cluster_258"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
