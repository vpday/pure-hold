import type { FundSnapshot } from '../models/fundSnapshot.ts'
import type { FundRefreshIssue } from '../services/tiantian/fundRefreshIssue.ts'
import type { FundRefreshBatch } from '../services/tiantian/fetchTiantianFundSnapshots.ts'

export interface MergedFundRefreshResult {
  readonly issues: readonly FundRefreshIssue[]
  readonly snapshotsByCode: Readonly<Record<string, FundSnapshot>>
  readonly updatedCount: number
}

export function mergeFundRefreshResult(
  currentSnapshots: Readonly<Record<string, FundSnapshot>>,
  currentFundOrder: readonly string[],
  requestedCodes: readonly string[],
  batch: FundRefreshBatch,
): MergedFundRefreshResult {
  const currentCodes = new Set(currentFundOrder)
  const requested = new Set(requestedCodes)
  const snapshotsByCode = { ...currentSnapshots }
  const issues = [...batch.issues]
  let updatedCount = 0

  for (const snapshot of batch.snapshots) {
    if (!requested.has(snapshot.code) || !currentCodes.has(snapshot.code)) {
      issues.push({ code: 'unexpected-record', fundCode: snapshot.code })
      continue
    }
    const currentSnapshot = snapshotsByCode[snapshot.code]
    if (currentSnapshot && isConfirmedSnapshotRegression(currentSnapshot, snapshot)) {
      continue
    }
    snapshotsByCode[snapshot.code] = snapshot
    updatedCount += 1
  }

  for (const code of Object.keys(snapshotsByCode)) {
    if (!currentCodes.has(code)) {
      delete snapshotsByCode[code]
    }
  }

  return { issues, snapshotsByCode, updatedCount }
}

function isConfirmedSnapshotRegression(current: FundSnapshot, incoming: FundSnapshot): boolean {
  if (!current.navDate || current.nav === null) return false
  if (!incoming.navDate || incoming.nav === null) return true
  return incoming.navDate < current.navDate
}
