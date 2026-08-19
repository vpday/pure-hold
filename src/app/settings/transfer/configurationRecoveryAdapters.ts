import type {
  DomainRecoveryAdapter,
  RecoveryAttempt,
} from '@/app/coordination/compensatedCommit.ts'
import type { CoordinationFailureFact } from '@/app/coordination/coordinationFailure.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition.ts'
import type { CommitIndexGroupsResult } from '@/domains/indices/services/createIndexSettingsCommandModule.ts'
import type { Portfolio } from '@/domains/portfolio/models/index.ts'

interface IndexRecoveryFacade {
  readonly commitIndexGroups: (groups: readonly IndexGroupDefinition[]) => CommitIndexGroupsResult
  readonly getIndexGroups: () => readonly IndexGroupDefinition[]
}

interface PortfolioRecoveryFacade {
  readonly getPortfolio: () => Portfolio
  readonly replacePortfolio: (portfolio: Portfolio) => {
    readonly ok: boolean
    readonly failure?: CoordinationFailureFact
  }
}

interface FundsRecoveryFacade {
  readonly getFundSettings: () => FundSettings
  readonly replaceFundSettings: (settings: FundSettings) => {
    readonly ok: boolean
    readonly failure?: CoordinationFailureFact
  }
}

export function createIndexRecoveryAdapter(
  facade: IndexRecoveryFacade,
): DomainRecoveryAdapter<readonly IndexGroupDefinition[]> {
  return {
    capture: facade.getIndexGroups,
    restore: (previous) => restoreIndexGroups(facade, previous),
  }
}

export function createPortfolioRecoveryAdapter(
  facade: PortfolioRecoveryFacade,
): DomainRecoveryAdapter<Portfolio> {
  return {
    capture: facade.getPortfolio,
    restore: (previous) => restorePortfolio(facade, previous),
  }
}

export function createFundsRecoveryAdapter(
  facade: FundsRecoveryFacade,
): DomainRecoveryAdapter<FundSettings> {
  return {
    capture: facade.getFundSettings,
    restore: (previous) => restoreFundSettings(facade, previous),
  }
}

function restoreIndexGroups(
  facade: IndexRecoveryFacade,
  previous: readonly IndexGroupDefinition[],
): RecoveryAttempt {
  try {
    return toRecoveryAttempt(facade.commitIndexGroups(previous))
  } catch (error) {
    return { error, ok: false }
  }
}

function restorePortfolio(facade: PortfolioRecoveryFacade, previous: Portfolio): RecoveryAttempt {
  try {
    return toRecoveryAttempt(facade.replacePortfolio(previous))
  } catch (error) {
    return { error, ok: false }
  }
}

function restoreFundSettings(facade: FundsRecoveryFacade, previous: FundSettings): RecoveryAttempt {
  try {
    return toRecoveryAttempt(facade.replaceFundSettings(previous))
  } catch (error) {
    return { error, ok: false }
  }
}

function toRecoveryAttempt(result: {
  readonly ok: boolean
  readonly error?: unknown
  readonly failure?: CoordinationFailureFact
}): RecoveryAttempt {
  return result.ok
    ? { ok: true }
    : { error: result.failure?.primaryError ?? result.error, ok: false }
}
