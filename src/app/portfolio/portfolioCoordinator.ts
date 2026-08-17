import type { FundHolding } from '@/domains/funds/models/fundHolding.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type {
  FieldValue,
  MoneyFieldValue,
  Portfolio,
  PortfolioInitialHoldingEvent,
} from '@/domains/portfolio/models/index.ts'
import type {
  CurrentNavByFund,
  PortfolioCalculation,
} from '@/domains/portfolio/services/calculatePortfolio.ts'
import type {
  PortfolioCommandResult,
  PortfolioStore,
} from '@/domains/portfolio/stores/createPortfolioStore.ts'

export interface FundsPortfolioFacade {
  readonly deleteFund: (fundCode: string) => { readonly error?: string }
  readonly getSettingsSnapshot: () => FundSettings
}

export type PortfolioCoordinationFacade = Pick<
  PortfolioStore,
  | 'addEvent'
  | 'calculate'
  | 'deleteEvent'
  | 'disableFund'
  | 'enableFund'
  | 'getPortfolio'
  | 'mergeCandidate'
  | 'updateEvent'
>

export interface PortfolioCoordinatorDependencies {
  readonly funds: FundsPortfolioFacade
  readonly portfolio: PortfolioCoordinationFacade
  readonly now?: () => string
}

export interface EnsureFundLedgerInput {
  readonly fundCode: string
}

export type EnsureFundLedgerStatus = 'created' | 'locked' | 'updated-initial-holding'

export type EnsureFundLedgerResult =
  | {
      readonly ok: true
      readonly event: PortfolioInitialHoldingEvent
      readonly fundCode: string
      readonly reconciliation: FundReconciliation
      readonly status: EnsureFundLedgerStatus
      readonly portfolio: Portfolio
    }
  | {
      readonly ok: false
      readonly fundCode: string
      readonly reason: 'fund-not-found' | 'missing-fund-holding' | 'portfolio-persistence-failed'
      readonly error?: unknown
      readonly partialPersistence: boolean
      readonly portfolio: Portfolio
      readonly retryable: boolean
    }

export interface ReconcileFundInput {
  readonly asOfDate: string
  readonly currentNavByFund: CurrentNavByFund
  readonly fundCode: string
}

export type ReconciliationAvailability =
  | 'available'
  | 'fund-not-found'
  | 'incomplete'
  | 'missing-fund-holding'
  | 'missing-ledger'

export interface FundReconciliation {
  readonly availability: ReconciliationAvailability
  readonly calculation: PortfolioCalculation
  readonly difference: {
    readonly costAmountCents: number | null
    readonly units: number | null
  }
  readonly fundCode: string
  readonly fundHolding: {
    readonly costAmountCents: number
    readonly units: number
  } | null
  readonly ledger: {
    readonly costAmount: MoneyFieldValue
    readonly units: FieldValue<number>
  } | null
  readonly initialEvent: PortfolioInitialHoldingEvent | null
  readonly initialEventLocked: boolean
  readonly ledgerEnabled: boolean
}

export interface FundDeletionStats {
  readonly adjustmentCount: number
  readonly cashDividendCount: number
  readonly dividendReinvestmentCount: number
  readonly eventCount: number
}

export interface FundDeletionPreview {
  readonly fundCode: string
  readonly fundName: string
  readonly stats: FundDeletionStats
}

export type FundDeletionPreviewResult =
  | { readonly ok: true; readonly preview: FundDeletionPreview }
  | { readonly ok: false; readonly reason: 'fund-not-found' }

export type FundDeletionResult =
  | {
      readonly ok: true
      readonly preview: FundDeletionPreview
      readonly status: 'already-absent' | 'deleted'
    }
  | {
      readonly ok: false
      readonly error?: unknown
      readonly funds: FundSettings
      readonly partialPersistence: boolean
      readonly portfolio: Portfolio
      readonly reason: 'funds-persistence-failed' | 'portfolio-persistence-failed'
      readonly preview: FundDeletionPreview
    }

export interface PortfolioCoordinator {
  readonly confirmFundDeletion: (preview: FundDeletionPreview) => FundDeletionResult
  readonly ensureFundLedger: (input: EnsureFundLedgerInput) => EnsureFundLedgerResult
  readonly prepareFundDeletion: (fundCode: string) => FundDeletionPreviewResult
  readonly reconcileFund: (input: ReconcileFundInput) => FundReconciliation
}

export function createPortfolioCoordinator(
  dependencies: PortfolioCoordinatorDependencies,
): PortfolioCoordinator {
  const now = dependencies.now ?? (() => new Date().toISOString())

  function ensureFundLedger(input: EnsureFundLedgerInput): EnsureFundLedgerResult {
    const settings = dependencies.funds.getSettingsSnapshot()
    if (!settings.funds.some(({ code }) => code === input.fundCode)) {
      return {
        fundCode: input.fundCode,
        ok: false,
        partialPersistence: false,
        portfolio: dependencies.portfolio.getPortfolio(),
        reason: 'fund-not-found',
        retryable: false,
      }
    }
    const holding = settings.holdingsByCode[input.fundCode]
    if (holding === undefined) {
      return {
        fundCode: input.fundCode,
        ok: false,
        partialPersistence: false,
        portfolio: dependencies.portfolio.getPortfolio(),
        reason: 'missing-fund-holding',
        retryable: false,
      }
    }

    const current = dependencies.portfolio.getPortfolio()
    const eventId = initialHoldingEventId(input.fundCode)
    const existingEvent = current.events.find((event) => event.id === eventId)
    if (existingEvent !== undefined && existingEvent.kind !== 'initial-holding') {
      return {
        error: new Error(`Initial holding ID conflicts for ${input.fundCode}`),
        fundCode: input.fundCode,
        ok: false,
        partialPersistence: false,
        portfolio: current,
        reason: 'portfolio-persistence-failed',
        retryable: false,
      }
    }

    const existingInitialEvent = existingEvent
    const auditedAt = now()
    const hasSubsequentEvents = current.events.some(
      (event) => event.fundCode === input.fundCode && event.id !== eventId,
    )
    let event: PortfolioInitialHoldingEvent
    let eventWasCreated = false
    let eventWasUpdated = false
    let status: EnsureFundLedgerStatus

    if (existingInitialEvent === undefined) {
      event = createInitialHoldingEvent(input.fundCode, holding, auditedAt)
      const addedEvent = dependencies.portfolio.addEvent(event)
      if (!addedEvent.ok) return portfolioFailure(input.fundCode, addedEvent, current)
      eventWasCreated = true
      status = 'created'
    } else if (hasSubsequentEvents) {
      event = existingInitialEvent
      status = 'locked'
    } else {
      event = updateInitialHoldingEvent(existingInitialEvent, holding, auditedAt)
      const updatedEvent = dependencies.portfolio.updateEvent(event)
      if (!updatedEvent.ok) return portfolioFailure(input.fundCode, updatedEvent, current)
      eventWasUpdated = true
      status = 'updated-initial-holding'
    }

    const enabled = dependencies.portfolio.enableFund(input.fundCode)
    if (!enabled.ok) {
      const rollback = eventWasCreated
        ? dependencies.portfolio.deleteEvent(eventId)
        : eventWasUpdated && existingInitialEvent !== undefined
          ? dependencies.portfolio.updateEvent(existingInitialEvent)
          : { ok: true as const }
      if (rollback.ok) return portfolioFailure(input.fundCode, enabled, current)
      return {
        error: rollback.error ?? enabled.error,
        fundCode: input.fundCode,
        ok: false,
        partialPersistence: true,
        portfolio: dependencies.portfolio.getPortfolio(),
        reason: 'portfolio-persistence-failed',
        retryable: true,
      }
    }

    const portfolio = dependencies.portfolio.getPortfolio()
    const reconciliation = reconcileFund({
      asOfDate: shanghaiDate(auditedAt),
      currentNavByFund: {},
      fundCode: input.fundCode,
    })
    const persistedEvent = portfolio.events.find((candidate) => candidate.id === eventId)
    return {
      event: persistedEvent?.kind === 'initial-holding' ? persistedEvent : event,
      fundCode: input.fundCode,
      ok: true,
      portfolio,
      reconciliation,
      status,
    }
  }

  function reconcileFund(input: ReconcileFundInput): FundReconciliation {
    const settings = dependencies.funds.getSettingsSnapshot()
    const calculation = dependencies.portfolio.calculate({
      asOfDate: input.asOfDate,
      currentNavByFund: input.currentNavByFund,
    })
    const holding = settings.holdingsByCode[input.fundCode]
    const aggregate = calculation.aggregates.find(({ fundCode }) => fundCode === input.fundCode)
    const ledger =
      aggregate === undefined ? null : { costAmount: aggregate.costAmount, units: aggregate.units }
    const fundHolding = holding === undefined ? null : toHoldingComparison(holding)
    const portfolio = dependencies.portfolio.getPortfolio()
    const initialEvent = portfolio.events.find(
      (event): event is PortfolioInitialHoldingEvent =>
        event.id === initialHoldingEventId(input.fundCode) && event.kind === 'initial-holding',
    )
    const availability = resolveAvailability(
      settings.funds.some(({ code }) => code === input.fundCode),
      fundHolding,
      ledger,
    )

    return {
      availability,
      calculation,
      difference: {
        costAmountCents:
          ledger !== null && ledger.costAmount.value !== null && fundHolding !== null
            ? ledger.costAmount.value - fundHolding.costAmountCents
            : null,
        units:
          ledger !== null && ledger.units.value !== null && fundHolding !== null
            ? ledger.units.value - fundHolding.units
            : null,
      },
      fundCode: input.fundCode,
      fundHolding,
      initialEvent: initialEvent ?? null,
      initialEventLocked: portfolio.events.some(
        (event) =>
          event.fundCode === input.fundCode && event.id !== initialHoldingEventId(input.fundCode),
      ),
      ledger,
      ledgerEnabled: portfolio.fundCodes.includes(input.fundCode),
    }
  }

  function prepareFundDeletion(fundCode: string): FundDeletionPreviewResult {
    const settings = dependencies.funds.getSettingsSnapshot()
    const fund = settings.funds.find(({ code }) => code === fundCode)
    if (fund === undefined) return { ok: false, reason: 'fund-not-found' }
    return { ok: true, preview: createDeletionPreview(fundCode, fund.name) }
  }

  function confirmFundDeletion(preview: FundDeletionPreview): FundDeletionResult {
    const previousPortfolio = dependencies.portfolio.getPortfolio()
    const currentSettings = dependencies.funds.getSettingsSnapshot()
    const currentFund = currentSettings.funds.find(({ code }) => code === preview.fundCode)
    const currentPreview = {
      fundCode: preview.fundCode,
      fundName: currentFund?.name ?? preview.fundName,
      stats: countDeletionStats(previousPortfolio, preview.fundCode),
    }
    const hasPortfolioData = hasPortfolioDataForFund(previousPortfolio, preview.fundCode)

    if (hasPortfolioData) {
      const portfolioResult = deletePortfolioData(preview.fundCode, previousPortfolio)
      if (!portfolioResult.ok) {
        return {
          error: portfolioResult.error,
          funds: currentSettings,
          ok: false,
          partialPersistence: portfolioResult.partialPersistence,
          portfolio: dependencies.portfolio.getPortfolio(),
          reason: 'portfolio-persistence-failed',
          preview: currentPreview,
        }
      }
    }

    if (currentFund !== undefined) {
      const fundsResult = dependencies.funds.deleteFund(preview.fundCode)
      if (fundsResult.error !== undefined) {
        const rollback = dependencies.portfolio.mergeCandidate(previousPortfolio)
        return {
          error: fundsResult.error,
          funds: dependencies.funds.getSettingsSnapshot(),
          ok: false,
          partialPersistence: !rollback.ok,
          portfolio: dependencies.portfolio.getPortfolio(),
          reason: 'funds-persistence-failed',
          preview: currentPreview,
        }
      }
    }

    return {
      ok: true,
      preview,
      status: currentFund === undefined && !hasPortfolioData ? 'already-absent' : 'deleted',
    }
  }

  function createDeletionPreview(fundCode: string, fundName: string): FundDeletionPreview {
    return {
      fundCode,
      fundName,
      stats: countDeletionStats(dependencies.portfolio.getPortfolio(), fundCode),
    }
  }

  function deletePortfolioData(
    fundCode: string,
    previous: Portfolio,
  ):
    | { readonly ok: true }
    | { readonly ok: false; readonly error?: unknown; readonly partialPersistence: boolean } {
    for (const event of previous.events.filter(
      ({ fundCode: eventFundCode }) => eventFundCode === fundCode,
    )) {
      const result = dependencies.portfolio.deleteEvent(event.id)
      if (!result.ok) return recoverPortfolioFailure(result, previous)
    }
    const result = dependencies.portfolio.disableFund(fundCode)
    if (!result.ok) return recoverPortfolioFailure(result, previous)
    return { ok: true }
  }

  function recoverPortfolioFailure(
    result: Extract<PortfolioCommandResult, { readonly ok: false }>,
    previous: Portfolio,
  ): { readonly ok: false; readonly error?: unknown; readonly partialPersistence: boolean } {
    const rollback = dependencies.portfolio.mergeCandidate(previous)
    return {
      error: result.error,
      ok: false,
      partialPersistence: !rollback.ok,
    }
  }

  return { confirmFundDeletion, ensureFundLedger, prepareFundDeletion, reconcileFund }
}

export function initialHoldingEventId(fundCode: string): string {
  return `initial-holding:${fundCode}`
}

function createInitialHoldingEvent(
  fundCode: string,
  holding: FundHolding,
  auditedAt: string,
): PortfolioInitialHoldingEvent {
  const confirmedDate = shanghaiDate(auditedAt)
  const units = holding.units
  const costAmount = Math.round(holding.units * holding.costPrice * 100)
  return {
    auditedAt,
    confirmedDate,
    costAmount: migrationField(costAmount),
    createdAt: auditedAt,
    fundCode,
    id: initialHoldingEventId(fundCode),
    kind: 'initial-holding',
    settlementStatus: 'settled',
    source: 'initial-holding',
    units: migrationField(units),
    updatedAt: auditedAt,
  }
}

function updateInitialHoldingEvent(
  event: PortfolioInitialHoldingEvent,
  holding: FundHolding,
  auditedAt: string,
): PortfolioInitialHoldingEvent {
  return {
    ...event,
    costAmount: migrationField(Math.round(holding.units * holding.costPrice * 100)),
    units: migrationField(holding.units),
    updatedAt: auditedAt,
  }
}

function migrationField(value: number): FieldValue<number> {
  return { confidence: 'actual', source: 'migration', value }
}

function toHoldingComparison(holding: FundHolding): {
  readonly costAmountCents: number
  readonly units: number
} {
  return {
    costAmountCents: Math.round(holding.units * holding.costPrice * 100),
    units: holding.units,
  }
}

function resolveAvailability(
  fundExists: boolean,
  fundHolding: FundReconciliation['fundHolding'],
  ledger: FundReconciliation['ledger'],
): ReconciliationAvailability {
  if (!fundExists) return 'fund-not-found'
  if (fundHolding === null) return 'missing-fund-holding'
  if (ledger === null) return 'missing-ledger'
  if (ledger.units.value === null || ledger.costAmount.value === null) return 'incomplete'
  return 'available'
}

function countDeletionStats(portfolio: Portfolio, fundCode: string): FundDeletionStats {
  const events = portfolio.events.filter((event) => event.fundCode === fundCode)
  return {
    adjustmentCount: events.filter(({ kind }) => kind === 'adjustment').length,
    cashDividendCount: events.filter(({ kind }) => kind === 'cash-dividend').length,
    dividendReinvestmentCount: events.filter(({ kind }) => kind === 'dividend-reinvestment').length,
    eventCount: events.length,
  }
}

function shanghaiDate(instant: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(new Date(instant))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function hasPortfolioDataForFund(portfolio: Portfolio, fundCode: string): boolean {
  return (
    portfolio.fundCodes.includes(fundCode) ||
    portfolio.events.some(({ fundCode: code }) => code === fundCode)
  )
}

function portfolioFailure(
  fundCode: string,
  result: Extract<PortfolioCommandResult, { readonly ok: false }>,
  current: Portfolio,
): EnsureFundLedgerResult {
  return {
    error: result.error,
    fundCode,
    ok: false,
    partialPersistence: false,
    portfolio: current,
    reason: 'portfolio-persistence-failed',
    retryable: true,
  }
}
