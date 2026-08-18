import {
  createFundHolding,
  holdingTotalCostCents,
  type FundHolding,
} from '@/domains/funds/models/fundHolding.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type {
  FieldValue,
  MoneyFieldValue,
  Portfolio,
  PortfolioAdjustmentEvent,
  PortfolioEvent,
  PortfolioInitialHoldingEvent,
} from '@/domains/portfolio/models/index.ts'
import type {
  CurrentNavByFund,
  PortfolioAggregateCalculation,
  PortfolioCalculation,
} from '@/domains/portfolio/services/calculatePortfolio.ts'
import type {
  PortfolioCommandResult,
  PortfolioStore,
} from '@/domains/portfolio/stores/createPortfolioStore.ts'

export type FundsSettingsWriteResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: 'invalid-settings' | 'persistence-failed' | 'unknown-fund'
      readonly error?: unknown
    }

export interface FundsPortfolioFacade {
  readonly deleteFund: (fundCode: string) => { readonly error?: string }
  readonly getSettingsSnapshot: () => FundSettings
  readonly replaceHoldingProjection: (holding: FundHolding) => FundsSettingsWriteResult
  readonly replaceSettingsPersisted: (settings: FundSettings) => FundsSettingsWriteResult
  readonly updateHoldingMetadata: (input: {
    readonly code: string
    readonly dividendMode: FundHolding['dividendMode']
    readonly purchaseDate: string
  }) => FundsSettingsWriteResult
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

export type PortfolioCoordinationStatus =
  | 'synced'
  | 'pending-confirmation'
  | 'pending-exact-data'
  | 'ledger-error'
  | 'portfolio-persistence-failed'
  | 'holding-sync-failed'

export interface PortfolioCoordinationResult {
  readonly ok: boolean
  readonly status: PortfolioCoordinationStatus
  readonly fundCode: string
  readonly portfolio: Portfolio
  readonly holding: FundHolding | null
  readonly ledger: PortfolioAggregateCalculation | null
  readonly calculation?: PortfolioCalculation
  readonly error?: unknown
  readonly partialPersistence: boolean
  readonly retryable: boolean
}

export interface CommitEventInput {
  readonly asOfDate?: string
  readonly currentNavByFund?: CurrentNavByFund
  readonly event: PortfolioEvent
}

export type DeleteEventInput =
  | string
  | {
      readonly asOfDate?: string
      readonly currentNavByFund?: CurrentNavByFund
      readonly eventId: string
      readonly fundCode?: string
    }

export interface CommitHoldingCorrectionInput {
  readonly asOfDate?: string
  readonly currentNavByFund?: CurrentNavByFund
  readonly confirmedDate: string
  readonly eventId?: string
  readonly fundCode: string
  readonly reason: string
  readonly targetUnits: number
  readonly totalCostCents: number
}

export interface FundLedgerState extends PortfolioCoordinationResult {
  readonly canCorrect: boolean
  readonly canRecord: boolean
}

export interface RebuildHoldingProjectionsResult {
  readonly status: 'synced' | 'pending' | 'failed'
  readonly results: readonly PortfolioCoordinationResult[]
  readonly portfolio: Portfolio
  readonly partialPersistence: boolean
  readonly retryable: boolean
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
      readonly reason:
        | 'empty-fund-holding'
        | 'fund-not-found'
        | 'missing-fund-holding'
        | 'portfolio-persistence-failed'
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
  readonly calculate: PortfolioCoordinationFacade['calculate']
  readonly commitEvent: (input: CommitEventInput) => PortfolioCoordinationResult
  readonly commitHoldingCorrection: (
    input: CommitHoldingCorrectionInput,
  ) => PortfolioCoordinationResult
  readonly confirmFundDeletion: (preview: FundDeletionPreview) => FundDeletionResult
  readonly deleteEvent: (input: DeleteEventInput) => PortfolioCoordinationResult
  readonly ensureFundLedger: (input: EnsureFundLedgerInput) => EnsureFundLedgerResult
  readonly getFundLedgerState: (input: ReconcileFundInput) => FundLedgerState
  readonly getPortfolio: PortfolioCoordinationFacade['getPortfolio']
  readonly prepareFundDeletion: (fundCode: string) => FundDeletionPreviewResult
  readonly rebuildHoldingProjections: (input: {
    readonly asOfDate: string
    readonly currentNavByFund?: CurrentNavByFund
  }) => RebuildHoldingProjectionsResult
  readonly reconcileFund: (input: ReconcileFundInput) => FundReconciliation
  readonly updateHoldingMetadata: (input: {
    readonly code: string
    readonly dividendMode: FundHolding['dividendMode']
    readonly purchaseDate: string
  }) => PortfolioCoordinationResult
}

export function createPortfolioCoordinator(
  dependencies: PortfolioCoordinatorDependencies,
): PortfolioCoordinator {
  const now = dependencies.now ?? (() => new Date().toISOString())

  function commitEvent(input: CommitEventInput): PortfolioCoordinationResult {
    const fundCode = input.event.fundCode
    const previousPortfolio = dependencies.portfolio.getPortfolio()
    const previousSettings = dependencies.funds.getSettingsSnapshot()
    const settingsHolding = previousSettings.holdingsByCode[fundCode]

    if (!previousSettings.funds.some(({ code }) => code === fundCode)) {
      return coordinationResult({
        error: new Error(`Fund ${fundCode} does not exist`),
        fundCode,
        holding: settingsHolding ?? null,
        ledger: null,
        partialPersistence: false,
        portfolio: previousPortfolio,
        retryable: false,
        status: 'ledger-error',
      })
    }

    const initial = ensureInitialEventForCommit(
      fundCode,
      input.event.kind === 'initial-holding',
      previousPortfolio,
      settingsHolding,
    )
    if (!initial.ok) {
      return coordinationResult({
        error: initial.error,
        fundCode,
        holding: settingsHolding ?? null,
        ledger: null,
        partialPersistence: initial.partialPersistence,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: true,
        status: 'portfolio-persistence-failed',
      })
    }

    const currentAfterInitial = dependencies.portfolio.getPortfolio()
    const existingEvent = currentAfterInitial.events.find(({ id }) => id === input.event.id)
    const eventResult = existingEvent
      ? existingEvent.kind !== input.event.kind
        ? failureResult(new Error(`Portfolio event ID ${input.event.id} conflicts`))
        : dependencies.portfolio.updateEvent(input.event)
      : dependencies.portfolio.addEvent(input.event)
    if (!eventResult.ok) {
      const rollback = restoreCrossDomainSnapshot(previousPortfolio, previousSettings)
      return coordinationResult({
        error: eventResult.error,
        fundCode,
        holding: settingsHolding ?? null,
        ledger: null,
        partialPersistence: !rollback.ok,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: true,
        status: 'portfolio-persistence-failed',
      })
    }

    const enabled = dependencies.portfolio.enableFund(fundCode)
    if (!enabled.ok) {
      const rollback = restoreCrossDomainSnapshot(previousPortfolio, previousSettings)
      return coordinationResult({
        error: enabled.error,
        fundCode,
        holding: settingsHolding ?? null,
        ledger: null,
        partialPersistence: !rollback.ok,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: true,
        status: 'portfolio-persistence-failed',
      })
    }

    return synchronizeProjection({
      asOfDate: input.asOfDate ?? shanghaiDate(now()),
      currentNavByFund: input.currentNavByFund ?? {},
      fundCode,
      previousPortfolio,
      previousSettings,
    })
  }

  function deleteEvent(input: DeleteEventInput): PortfolioCoordinationResult {
    const normalized = typeof input === 'string' ? { eventId: input } : input
    const previousPortfolio = dependencies.portfolio.getPortfolio()
    const previousSettings = dependencies.funds.getSettingsSnapshot()
    const event = previousPortfolio.events.find(({ id }) => id === normalized.eventId)
    const fundCode = event?.fundCode ?? normalized.fundCode ?? ''
    if (event === undefined) {
      return currentLedgerState({
        asOfDate: normalized.asOfDate ?? shanghaiDate(now()),
        currentNavByFund: normalized.currentNavByFund ?? {},
        fundCode,
      })
    }

    const deleted = dependencies.portfolio.deleteEvent(normalized.eventId)
    if (!deleted.ok) {
      return coordinationResult({
        error: deleted.error,
        fundCode,
        holding: previousSettings.holdingsByCode[fundCode] ?? null,
        ledger: null,
        partialPersistence: false,
        portfolio: previousPortfolio,
        retryable: true,
        status: 'portfolio-persistence-failed',
      })
    }

    const hasRemainingEvents = dependencies.portfolio
      .getPortfolio()
      .events.some((candidate) => candidate.fundCode === fundCode)
    if (!hasRemainingEvents) {
      const disabled = dependencies.portfolio.disableFund(fundCode)
      if (!disabled.ok) {
        const rollback = restoreCrossDomainSnapshot(previousPortfolio, previousSettings)
        return coordinationResult({
          error: disabled.error,
          fundCode,
          holding: previousSettings.holdingsByCode[fundCode] ?? null,
          ledger: null,
          partialPersistence: !rollback.ok,
          portfolio: dependencies.portfolio.getPortfolio(),
          retryable: true,
          status: 'portfolio-persistence-failed',
        })
      }
    }

    return synchronizeProjection({
      asOfDate: normalized.asOfDate ?? shanghaiDate(now()),
      currentNavByFund: normalized.currentNavByFund ?? {},
      fundCode,
      previousPortfolio,
      previousSettings,
    })
  }

  function commitHoldingCorrection(
    input: CommitHoldingCorrectionInput,
  ): PortfolioCoordinationResult {
    const auditedAt = now()
    const event: PortfolioAdjustmentEvent = {
      auditedAt,
      confirmedDate: input.confirmedDate,
      createdAt: auditedAt,
      fundCode: input.fundCode,
      id: input.eventId ?? `adjustment:${input.fundCode}:${input.confirmedDate}`,
      kind: 'adjustment',
      reason: input.reason,
      settlementStatus: 'settled',
      source: 'adjustment',
      targetCostAmount: migrationField(input.totalCostCents),
      targetUnits: migrationField(input.targetUnits),
      updatedAt: auditedAt,
    }
    return commitEvent({
      asOfDate: input.asOfDate,
      currentNavByFund: input.currentNavByFund,
      event,
    })
  }

  function getFundLedgerState(input: ReconcileFundInput): FundLedgerState {
    const result = currentLedgerState(input)
    return {
      ...result,
      canCorrect: result.status === 'synced' || result.status === 'pending-exact-data',
      canRecord:
        result.status !== 'ledger-error' && result.status !== 'portfolio-persistence-failed',
    }
  }

  function currentLedgerState(input: ReconcileFundInput): PortfolioCoordinationResult {
    const settings = dependencies.funds.getSettingsSnapshot()
    const holding = settings.holdingsByCode[input.fundCode] ?? null
    const portfolio = dependencies.portfolio.getPortfolio()
    try {
      const calculation = dependencies.portfolio.calculate({
        asOfDate: input.asOfDate,
        currentNavByFund: input.currentNavByFund,
      })
      const ledger = aggregateFor(calculation, input.fundCode)
      return coordinationResult({
        calculation,
        fundCode: input.fundCode,
        holding,
        ledger,
        partialPersistence: false,
        portfolio,
        retryable: false,
        status: statusForCalculation(calculation, input.fundCode),
      })
    } catch (error) {
      return coordinationResult({
        error,
        fundCode: input.fundCode,
        holding,
        ledger: null,
        partialPersistence: false,
        portfolio,
        retryable: true,
        status: 'ledger-error',
      })
    }
  }

  function rebuildHoldingProjections(input: {
    readonly asOfDate: string
    readonly currentNavByFund?: CurrentNavByFund
  }): RebuildHoldingProjectionsResult {
    const portfolio = dependencies.portfolio.getPortfolio()
    const fundCodes = new Set(portfolio.events.map(({ fundCode }) => fundCode))
    const results: PortfolioCoordinationResult[] = []
    for (const fundCode of fundCodes) {
      const previousPortfolio = dependencies.portfolio.getPortfolio()
      const previousSettings = dependencies.funds.getSettingsSnapshot()
      results.push(
        synchronizeProjection({
          asOfDate: input.asOfDate,
          currentNavByFund: input.currentNavByFund ?? {},
          fundCode,
          previousPortfolio,
          previousSettings,
        }),
      )
    }
    const failed = results.some(
      ({ status }) => status === 'ledger-error' || status === 'holding-sync-failed',
    )
    const pending = results.some(
      ({ status }) => status === 'pending-confirmation' || status === 'pending-exact-data',
    )
    return {
      partialPersistence: results.some(({ partialPersistence }) => partialPersistence),
      portfolio: dependencies.portfolio.getPortfolio(),
      results,
      retryable: failed || pending,
      status: failed ? 'failed' : pending ? 'pending' : 'synced',
    }
  }

  function updateHoldingMetadata(input: {
    readonly code: string
    readonly dividendMode: FundHolding['dividendMode']
    readonly purchaseDate: string
  }): PortfolioCoordinationResult {
    const previousPortfolio = dependencies.portfolio.getPortfolio()
    const previousSettings = dependencies.funds.getSettingsSnapshot()
    const writer = dependencies.funds.updateHoldingMetadata
    if (writer === undefined) {
      return coordinationResult({
        error: new Error('Funds metadata adapter is unavailable'),
        fundCode: input.code,
        holding: previousSettings.holdingsByCode[input.code] ?? null,
        ledger: null,
        partialPersistence: false,
        portfolio: previousPortfolio,
        retryable: true,
        status: 'holding-sync-failed',
      })
    }

    let result: FundsSettingsWriteResult
    try {
      result = writer(input)
    } catch (error) {
      result = { error, ok: false, reason: 'persistence-failed' }
    }
    if (!result.ok) {
      return coordinationResult({
        error: result.error,
        fundCode: input.code,
        holding: previousSettings.holdingsByCode[input.code] ?? null,
        ledger: null,
        partialPersistence: false,
        portfolio: previousPortfolio,
        retryable: result.reason !== 'unknown-fund',
        status: 'holding-sync-failed',
      })
    }

    const holding = dependencies.funds.getSettingsSnapshot().holdingsByCode[input.code] ?? null
    if (holding === null || holding.units <= 0) {
      return coordinationResult({
        fundCode: input.code,
        holding,
        ledger: aggregateForCurrent(input.code),
        partialPersistence: false,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: false,
        status: 'synced',
      })
    }

    const ensured = ensureFundLedger({ fundCode: input.code })
    if (!ensured.ok) {
      const restored = restoreCrossDomainSnapshot(previousPortfolio, previousSettings)
      return coordinationResult({
        error: ensured.error,
        fundCode: input.code,
        holding: previousSettings.holdingsByCode[input.code] ?? null,
        ledger: null,
        partialPersistence: !restored.ok || ensured.partialPersistence,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: true,
        status: 'portfolio-persistence-failed',
      })
    }
    return getFundLedgerState({
      asOfDate: shanghaiDate(now()),
      currentNavByFund: {},
      fundCode: input.code,
    })
  }

  function reconcileFund(input: ReconcileFundInput): FundReconciliation {
    const settings = dependencies.funds.getSettingsSnapshot()
    const calculation = dependencies.portfolio.calculate({
      asOfDate: input.asOfDate,
      currentNavByFund: input.currentNavByFund,
    })
    const holding = settings.holdingsByCode[input.fundCode]
    const aggregate = aggregateFor(calculation, input.fundCode)
    const ledger =
      aggregate === null ? null : { costAmount: aggregate.costAmount, units: aggregate.units }
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
      return portfolioFailure(
        input.fundCode,
        failureResult(new Error(`Initial holding ID conflicts for ${input.fundCode}`)),
        current,
      )
    }

    const totalCostCents = holdingTotalCostCents(holding)
    const hasActiveHolding = holding.units > 0 && (totalCostCents ?? 0) > 0
    if (!hasActiveHolding && existingEvent === undefined) {
      return {
        fundCode: input.fundCode,
        ok: false,
        partialPersistence: false,
        portfolio: current,
        reason: 'empty-fund-holding',
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
        const rollback = restorePortfolioSnapshot(previousPortfolio)
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
    const rollback = restorePortfolioSnapshot(previous)
    return {
      error: result.error,
      ok: false,
      partialPersistence: !rollback.ok,
    }
  }

  function synchronizeProjection(input: {
    readonly asOfDate: string
    readonly currentNavByFund: CurrentNavByFund
    readonly fundCode: string
    readonly previousPortfolio: Portfolio
    readonly previousSettings: FundSettings
  }): PortfolioCoordinationResult {
    const holding = input.previousSettings.holdingsByCode[input.fundCode] ?? null
    let calculation: PortfolioCalculation
    try {
      calculation = dependencies.portfolio.calculate({
        asOfDate: input.asOfDate,
        currentNavByFund: input.currentNavByFund,
      })
    } catch (error) {
      return coordinationResult({
        error,
        fundCode: input.fundCode,
        holding,
        ledger: null,
        partialPersistence: false,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: true,
        status: 'ledger-error',
      })
    }

    const status = statusForCalculation(calculation, input.fundCode)
    const ledger = aggregateFor(calculation, input.fundCode)
    if (
      status !== 'synced' ||
      ledger === null ||
      ledger.units.value === null ||
      ledger.costAmount.value === null
    ) {
      return coordinationResult({
        calculation,
        fundCode: input.fundCode,
        holding,
        ledger,
        partialPersistence: false,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: status !== 'synced',
        status,
      })
    }

    const projectedHolding = createProjectedHolding(
      input.fundCode,
      ledger,
      holding,
      dependencies.portfolio.getPortfolio(),
    )
    const writer = dependencies.funds.replaceHoldingProjection
    if (writer === undefined) {
      const rollback = restoreCrossDomainSnapshot(input.previousPortfolio, input.previousSettings)
      return coordinationResult({
        calculation,
        error: new Error('Funds projection adapter is unavailable'),
        fundCode: input.fundCode,
        holding,
        ledger,
        partialPersistence: !rollback.ok,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: true,
        status: 'holding-sync-failed',
      })
    }

    let writeResult: FundsSettingsWriteResult
    try {
      writeResult = writer(projectedHolding)
    } catch (error) {
      writeResult = { error, ok: false, reason: 'persistence-failed' }
    }
    if (!writeResult.ok) {
      const rollback = restoreCrossDomainSnapshot(input.previousPortfolio, input.previousSettings)
      return coordinationResult({
        calculation,
        error: writeResult.error ?? new Error(writeResult.reason),
        fundCode: input.fundCode,
        holding,
        ledger,
        partialPersistence: !rollback.ok,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable: true,
        status: 'holding-sync-failed',
      })
    }

    return coordinationResult({
      calculation,
      fundCode: input.fundCode,
      holding:
        dependencies.funds.getSettingsSnapshot().holdingsByCode[input.fundCode] ?? projectedHolding,
      ledger,
      partialPersistence: false,
      portfolio: dependencies.portfolio.getPortfolio(),
      retryable: false,
      status: 'synced',
    })
  }

  function aggregateForCurrent(fundCode: string): PortfolioAggregateCalculation | null {
    try {
      return aggregateFor(
        dependencies.portfolio.calculate({
          asOfDate: shanghaiDate(now()),
          currentNavByFund: {},
        }),
        fundCode,
      )
    } catch {
      return null
    }
  }

  return {
    calculate: dependencies.portfolio.calculate,
    commitEvent,
    commitHoldingCorrection,
    confirmFundDeletion,
    deleteEvent,
    ensureFundLedger,
    getFundLedgerState,
    getPortfolio: dependencies.portfolio.getPortfolio,
    prepareFundDeletion,
    rebuildHoldingProjections,
    reconcileFund,
    updateHoldingMetadata,
  }

  function ensureInitialEventForCommit(
    fundCode: string,
    eventIsInitial: boolean,
    previousPortfolio: Portfolio,
    holding: FundHolding | undefined,
  ):
    | { readonly ok: true }
    | { readonly ok: false; readonly error: unknown; readonly partialPersistence: boolean } {
    if (eventIsInitial) return { ok: true }
    const eventId = initialHoldingEventId(fundCode)
    const existing = previousPortfolio.events.find(({ id }) => id === eventId)
    if (existing !== undefined) {
      if (existing.kind !== 'initial-holding') {
        return {
          error: new Error(`Initial holding ID conflicts for ${fundCode}`),
          ok: false,
          partialPersistence: false,
        }
      }
      return { ok: true }
    }
    if (previousPortfolio.events.some((event) => event.fundCode === fundCode)) {
      return { ok: true }
    }
    const totalCostCents = holding === undefined ? null : holdingTotalCostCents(holding)
    if (
      holding === undefined ||
      holding.units <= 0 ||
      totalCostCents === null ||
      totalCostCents <= 0
    ) {
      return { ok: true }
    }
    const initial = createInitialHoldingEvent(fundCode, holding, now())
    const result = dependencies.portfolio.addEvent(initial)
    return result.ok ? { ok: true } : { error: result.error, ok: false, partialPersistence: false }
  }

  function restoreSettingsIfChanged(previous: FundSettings): boolean {
    if (stableSerialize(previous) === stableSerialize(dependencies.funds.getSettingsSnapshot())) {
      return true
    }
    const restore = dependencies.funds.replaceSettingsPersisted
    if (restore === undefined) return false
    try {
      return restore(previous).ok
    } catch {
      return false
    }
  }

  function restoreCrossDomainSnapshot(
    previousPortfolio: Portfolio,
    previousSettings: FundSettings,
  ): { readonly ok: boolean; readonly error?: unknown } {
    const portfolioRollback = restorePortfolioSnapshot(previousPortfolio)
    const settingsRollback = restoreSettingsIfChanged(previousSettings)
    return {
      error: portfolioRollback.error,
      ok: portfolioRollback.ok && settingsRollback,
    }
  }

  function restorePortfolioSnapshot(previous: Portfolio): {
    readonly ok: boolean
    readonly error?: unknown
  } {
    try {
      let current = dependencies.portfolio.getPortfolio()
      for (const event of current.events) {
        if (!previous.events.some(({ id }) => id === event.id)) {
          const result = dependencies.portfolio.deleteEvent(event.id)
          if (!result.ok) return { error: result.error, ok: false }
        }
      }
      current = dependencies.portfolio.getPortfolio()
      for (const event of previous.events) {
        const existing = current.events.find(({ id }) => id === event.id)
        const result =
          existing === undefined
            ? dependencies.portfolio.addEvent(event)
            : stableSerialize(existing) === stableSerialize(event)
              ? { ok: true as const }
              : dependencies.portfolio.updateEvent(event)
        if (!result.ok) return { error: result.error, ok: false }
        current = dependencies.portfolio.getPortfolio()
      }
      current = dependencies.portfolio.getPortfolio()
      for (const code of current.fundCodes) {
        if (!previous.fundCodes.includes(code)) {
          const result = dependencies.portfolio.disableFund(code)
          if (!result.ok) return { error: result.error, ok: false }
        }
      }
      current = dependencies.portfolio.getPortfolio()
      for (const code of previous.fundCodes) {
        if (!current.fundCodes.includes(code)) {
          const result = dependencies.portfolio.enableFund(code)
          if (!result.ok) return { error: result.error, ok: false }
        }
      }
      return { ok: true }
    } catch (error) {
      return { error, ok: false }
    }
  }
}

export function initialHoldingEventId(fundCode: string): string {
  return `initial-holding:${fundCode}`
}

function createInitialHoldingEvent(
  fundCode: string,
  holding: FundHolding,
  auditedAt: string,
): PortfolioInitialHoldingEvent {
  return {
    auditedAt,
    confirmedDate: shanghaiDate(auditedAt),
    costAmount: migrationField(holdingTotalCostCents(holding) ?? 0),
    createdAt: auditedAt,
    fundCode,
    id: initialHoldingEventId(fundCode),
    kind: 'initial-holding',
    settlementStatus: 'settled',
    source: 'initial-holding',
    units: migrationField(holding.units),
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
    costAmount: migrationField(holdingTotalCostCents(holding) ?? 0),
    units: migrationField(holding.units),
    updatedAt: auditedAt,
  }
}

function createProjectedHolding(
  fundCode: string,
  aggregate: PortfolioAggregateCalculation,
  previous: FundHolding | null,
  portfolio: Portfolio,
): FundHolding {
  const firstConfirmedDate = portfolio.events
    .filter((event) => event.fundCode === fundCode)
    .map((event) => ('confirmedDate' in event ? event.confirmedDate : undefined))
    .filter((date): date is string => date !== undefined)
    .sort()[0]
  return createFundHolding({
    code: fundCode,
    dividendMode: previous?.dividendMode ?? 'cash',
    purchaseDate:
      previous?.purchaseDate ?? firstConfirmedDate ?? shanghaiDate(new Date().toISOString()),
    totalCostCents: Math.max(0, Math.round(aggregate.costAmount.value ?? 0)),
    units: Math.round(Math.max(0, aggregate.units.value ?? 0) * 10_000) / 10_000,
  })
}

function toHoldingComparison(holding: FundHolding): {
  readonly costAmountCents: number
  readonly units: number
} {
  return {
    costAmountCents: holdingTotalCostCents(holding) ?? 0,
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

function aggregateFor(
  calculation: PortfolioCalculation,
  fundCode: string,
): PortfolioAggregateCalculation | null {
  return calculation.aggregates.find(({ fundCode: code }) => code === fundCode) ?? null
}

function statusForCalculation(
  calculation: PortfolioCalculation,
  fundCode: string,
): PortfolioCoordinationStatus {
  if (calculation.issues.some(({ fundCode: code }) => code === fundCode)) return 'ledger-error'
  if (calculation.pendingSettlement.some(({ fundCode: code }) => code === fundCode)) {
    return 'pending-confirmation'
  }
  const aggregate = aggregateFor(calculation, fundCode)
  if (
    aggregate === null ||
    aggregate.units.value === null ||
    aggregate.costAmount.value === null ||
    aggregate.units.confidence !== 'actual' ||
    aggregate.costAmount.confidence !== 'actual'
  ) {
    return 'pending-exact-data'
  }
  return 'synced'
}

function coordinationResult(input: {
  readonly calculation?: PortfolioCalculation
  readonly error?: unknown
  readonly fundCode: string
  readonly holding: FundHolding | null
  readonly ledger: PortfolioAggregateCalculation | null
  readonly partialPersistence: boolean
  readonly portfolio: Portfolio
  readonly retryable: boolean
  readonly status: PortfolioCoordinationStatus
}): PortfolioCoordinationResult {
  return {
    ...input,
    ok: input.status === 'synced',
  }
}

function failureResult(error: unknown): Extract<PortfolioCommandResult, { readonly ok: false }> {
  return { error, ok: false, reason: 'conflict' }
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

function migrationField(value: number): FieldValue<number> {
  return { confidence: 'actual', source: 'migration', value }
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
