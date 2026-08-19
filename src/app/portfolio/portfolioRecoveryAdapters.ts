import type {
  DomainRecoveryAdapter,
  RecoveryAttempt,
} from '@/app/coordination/compensatedCommit.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type { Portfolio } from '@/domains/portfolio/models/index.ts'

interface PortfolioRecoveryFacade {
  readonly addEvent: (event: Portfolio['events'][number]) => {
    readonly ok: boolean
    readonly error?: unknown
  }
  readonly deleteEvent: (eventId: string) => { readonly ok: boolean; readonly error?: unknown }
  readonly disableFund: (fundCode: string) => { readonly ok: boolean; readonly error?: unknown }
  readonly enableFund: (fundCode: string) => { readonly ok: boolean; readonly error?: unknown }
  readonly getPortfolio: () => Portfolio
  readonly updateEvent: (event: Portfolio['events'][number]) => {
    readonly ok: boolean
    readonly error?: unknown
  }
}

interface FundsRecoveryFacade {
  readonly getSettingsSnapshot: () => FundSettings
  readonly replaceSettingsPersisted?: (settings: FundSettings) => {
    readonly ok: boolean
    readonly error?: unknown
  }
}

export function createPortfolioRecoveryAdapter(
  facade: PortfolioRecoveryFacade,
): DomainRecoveryAdapter<Portfolio> {
  return {
    capture: () => facade.getPortfolio(),
    restore: (previous) => restorePortfolioSnapshot(facade, previous),
  }
}

export function createFundsRecoveryAdapter(
  facade: FundsRecoveryFacade,
): DomainRecoveryAdapter<FundSettings> {
  return {
    capture: () => facade.getSettingsSnapshot(),
    restore: (previous) => restoreSettingsIfChanged(facade, previous),
  }
}

function restoreSettingsIfChanged(
  facade: FundsRecoveryFacade,
  previous: FundSettings,
): RecoveryAttempt {
  if (stableSerialize(previous) === stableSerialize(facade.getSettingsSnapshot())) {
    return { ok: true }
  }
  const restore = facade.replaceSettingsPersisted
  if (restore === undefined) return { ok: false }
  try {
    const result = restore(previous)
    return result.ok ? { ok: true } : { error: result.error, ok: false }
  } catch (error) {
    return { error, ok: false }
  }
}

function restorePortfolioSnapshot(
  facade: PortfolioRecoveryFacade,
  previous: Portfolio,
): RecoveryAttempt {
  try {
    let current = facade.getPortfolio()
    for (const event of current.events) {
      if (!previous.events.some(({ id }) => id === event.id)) {
        const result = facade.deleteEvent(event.id)
        if (!result.ok) return { error: result.error, ok: false }
      }
    }

    current = facade.getPortfolio()
    for (const event of previous.events) {
      const existing = current.events.find(({ id }) => id === event.id)
      const result =
        existing === undefined
          ? facade.addEvent(event)
          : stableSerialize(existing) === stableSerialize(event)
            ? { ok: true as const }
            : facade.updateEvent(event)
      if (!result.ok) return { error: result.error, ok: false }
      current = facade.getPortfolio()
    }

    current = facade.getPortfolio()
    for (const code of current.fundCodes) {
      if (!previous.fundCodes.includes(code)) {
        const result = facade.disableFund(code)
        if (!result.ok) return { error: result.error, ok: false }
      }
    }

    current = facade.getPortfolio()
    for (const code of previous.fundCodes) {
      if (!current.fundCodes.includes(code)) {
        const result = facade.enableFund(code)
        if (!result.ok) return { error: result.error, ok: false }
      }
    }
    return { ok: true }
  } catch (error) {
    return { error, ok: false }
  }
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    )
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
