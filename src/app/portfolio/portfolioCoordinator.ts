import {
  defineCompensatedStage,
  runCompensatedCommit,
  type CompensatedStageAttempt,
} from '@/app/coordination/compensatedCommit.ts'
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
import {
  createFundsRecoveryAdapter,
  createPortfolioRecoveryAdapter,
} from './portfolioRecoveryAdapters.ts'

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

type PortfolioRecoveryRoute = 'none' | 'portfolio-then-funds'
type MetadataRecoveryRoute = 'none' | 'portfolio-then-funds'
type FundDeletionRecoveryRoute = 'none' | 'portfolio-only' | 'portfolio-then-funds'

interface ProjectionCommitState {
  calculation?: PortfolioCalculation
  error?: unknown
  holding: FundHolding | null
  ledger: PortfolioAggregateCalculation | null
  projectedHolding?: FundHolding
  retryable: boolean
  shouldProject: boolean
  status: PortfolioCoordinationStatus
}

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
  const portfolioRecoveryAdapter = createPortfolioRecoveryAdapter(dependencies.portfolio)
  const fundsRecoveryAdapter = createFundsRecoveryAdapter(dependencies.funds)

  function runProjectionCommit(input: {
    readonly executePortfolio: (
      state: ProjectionCommitState,
    ) => CompensatedStageAttempt<PortfolioRecoveryRoute>
    readonly fundCode: string
    readonly holding: FundHolding | null
  }): PortfolioCoordinationResult {
    const state: ProjectionCommitState = {
      holding: input.holding,
      ledger: null,
      retryable: false,
      shouldProject: false,
      status: 'synced',
    }
    const result = runCompensatedCommit<PortfolioRecoveryRoute>({
      recoveryRoutes: {
        none: [],
        'portfolio-then-funds': ['portfolio', 'funds'],
      },
      stages: [
        defineCompensatedStage<Portfolio, PortfolioRecoveryRoute>({
          adapter: portfolioRecoveryAdapter,
          domain: 'portfolio',
          execute: () => input.executePortfolio(state),
          unexpectedRecoveryRoute: 'portfolio-then-funds',
        }),
        defineCompensatedStage<FundSettings, PortfolioRecoveryRoute>({
          adapter: fundsRecoveryAdapter,
          domain: 'funds',
          execute: () => {
            if (!state.shouldProject) return { ok: true }

            const writer = dependencies.funds.replaceHoldingProjection
            if (writer === undefined) {
              state.error = new Error('Funds projection adapter is unavailable')
              state.retryable = true
              state.status = 'holding-sync-failed'
              return {
                ok: false,
                primaryError: state.error,
                recovery: 'required' as const,
                recoveryRoute: 'portfolio-then-funds' as const,
              }
            }

            let writeResult: FundsSettingsWriteResult
            try {
              writeResult = writer(state.projectedHolding as FundHolding)
            } catch (error) {
              writeResult = { error, ok: false, reason: 'persistence-failed' }
            }
            if (!writeResult.ok) {
              state.error = writeResult.error ?? new Error(writeResult.reason)
              state.retryable = true
              state.status = 'holding-sync-failed'
              return {
                ok: false,
                primaryError: state.error,
                recovery: 'required' as const,
                recoveryRoute: 'portfolio-then-funds' as const,
              }
            }

            state.holding =
              dependencies.funds.getSettingsSnapshot().holdingsByCode[input.fundCode] ??
              state.projectedHolding ??
              null
            return { ok: true }
          },
          unexpectedRecoveryRoute: 'portfolio-then-funds',
        }),
      ],
    })

    const failure = result.ok ? undefined : result.failure
    return coordinationResult({
      calculation: state.calculation,
      error: failure?.primaryError ?? state.error,
      fundCode: input.fundCode,
      holding: state.holding,
      ledger: state.ledger,
      partialPersistence: failure?.persistence === 'partial',
      portfolio: dependencies.portfolio.getPortfolio(),
      retryable: state.retryable,
      status: state.status,
    })
  }

  function calculateProjection(
    state: ProjectionCommitState,
    input: ReconcileFundInput,
  ): CompensatedStageAttempt<PortfolioRecoveryRoute> {
    try {
      state.calculation = dependencies.portfolio.calculate({
        asOfDate: input.asOfDate,
        currentNavByFund: input.currentNavByFund,
      })
    } catch (error) {
      state.error = error
      state.retryable = true
      state.status = 'ledger-error'
      return { ok: true }
    }

    state.status = statusForCalculation(state.calculation, input.fundCode)
    state.ledger = aggregateFor(state.calculation, input.fundCode)
    state.retryable = state.status !== 'synced'
    if (
      state.status !== 'synced' ||
      state.ledger === null ||
      state.ledger.units.value === null ||
      state.ledger.costAmount.value === null
    ) {
      return { ok: true }
    }

    state.projectedHolding = createProjectedHolding(
      input.fundCode,
      state.ledger,
      state.holding,
      dependencies.portfolio.getPortfolio(),
    )
    state.shouldProject = true
    return { ok: true }
  }

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

    return runProjectionCommit({
      executePortfolio: (state) => {
        const initial = ensureInitialEventForCommit(
          fundCode,
          input.event.kind === 'initial-holding',
          previousPortfolio,
          settingsHolding,
        )
        if (!initial.ok) {
          state.error = initial.error
          state.retryable = true
          state.status = 'portfolio-persistence-failed'
          return {
            ok: false,
            primaryError: initial.error,
            recovery: 'not-needed' as const,
            recoveryRoute: 'none' as const,
          }
        }

        const currentAfterInitial = dependencies.portfolio.getPortfolio()
        const existingEvent = currentAfterInitial.events.find(({ id }) => id === input.event.id)
        const eventResult = existingEvent
          ? existingEvent.kind !== input.event.kind
            ? failureResult(new Error(`Portfolio event ID ${input.event.id} conflicts`))
            : dependencies.portfolio.updateEvent(input.event)
          : dependencies.portfolio.addEvent(input.event)
        if (!eventResult.ok) {
          state.error = eventResult.error
          state.retryable = true
          state.status = 'portfolio-persistence-failed'
          return {
            ok: false,
            primaryError: eventResult.error,
            recovery: 'required' as const,
            recoveryRoute: 'portfolio-then-funds' as const,
          }
        }

        const enabled = dependencies.portfolio.enableFund(fundCode)
        if (!enabled.ok) {
          state.error = enabled.error
          state.retryable = true
          state.status = 'portfolio-persistence-failed'
          return {
            ok: false,
            primaryError: enabled.error,
            recovery: 'required' as const,
            recoveryRoute: 'portfolio-then-funds' as const,
          }
        }

        return calculateProjection(state, {
          asOfDate: input.asOfDate ?? shanghaiDate(now()),
          currentNavByFund: input.currentNavByFund ?? {},
          fundCode,
        })
      },
      fundCode,
      holding: settingsHolding ?? null,
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

    return runProjectionCommit({
      executePortfolio: (state) => {
        const deleted = dependencies.portfolio.deleteEvent(normalized.eventId)
        if (!deleted.ok) {
          state.error = deleted.error
          state.retryable = true
          state.status = 'portfolio-persistence-failed'
          return {
            ok: false,
            primaryError: deleted.error,
            recovery: 'not-needed' as const,
            recoveryRoute: 'none' as const,
          }
        }

        const hasRemainingEvents = dependencies.portfolio
          .getPortfolio()
          .events.some((candidate) => candidate.fundCode === fundCode)
        if (!hasRemainingEvents) {
          const disabled = dependencies.portfolio.disableFund(fundCode)
          if (!disabled.ok) {
            state.error = disabled.error
            state.retryable = true
            state.status = 'portfolio-persistence-failed'
            return {
              ok: false,
              primaryError: disabled.error,
              recovery: 'required' as const,
              recoveryRoute: 'portfolio-then-funds' as const,
            }
          }
        }

        return calculateProjection(state, {
          asOfDate: normalized.asOfDate ?? shanghaiDate(now()),
          currentNavByFund: normalized.currentNavByFund ?? {},
          fundCode,
        })
      },
      fundCode,
      holding: previousSettings.holdingsByCode[fundCode] ?? null,
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
    const previousSettings = dependencies.funds.getSettingsSnapshot()
    let primaryError: unknown
    let status: PortfolioCoordinationStatus = 'synced'
    let retryable = false
    let ensured: EnsureFundLedgerResult | undefined
    const result = runCompensatedCommit<MetadataRecoveryRoute>({
      recoveryRoutes: {
        none: [],
        'portfolio-then-funds': ['portfolio', 'funds'],
      },
      stages: [
        defineCompensatedStage<FundSettings, MetadataRecoveryRoute>({
          adapter: fundsRecoveryAdapter,
          domain: 'funds',
          execute: () => {
            const writer = dependencies.funds.updateHoldingMetadata
            if (writer === undefined) {
              primaryError = new Error('Funds metadata adapter is unavailable')
              retryable = true
              status = 'holding-sync-failed'
              return {
                ok: false,
                primaryError,
                recovery: 'not-needed' as const,
                recoveryRoute: 'none' as const,
              }
            }

            let writeResult: FundsSettingsWriteResult
            try {
              writeResult = writer(input)
            } catch (error) {
              writeResult = { error, ok: false, reason: 'persistence-failed' }
            }
            if (!writeResult.ok) {
              primaryError = writeResult.error
              retryable = writeResult.reason !== 'unknown-fund'
              status = 'holding-sync-failed'
              return {
                ok: false,
                primaryError,
                recovery: 'not-needed' as const,
                recoveryRoute: 'none' as const,
              }
            }
            return { ok: true }
          },
          unexpectedRecoveryRoute: 'portfolio-then-funds',
        }),
        defineCompensatedStage<Portfolio, MetadataRecoveryRoute>({
          adapter: portfolioRecoveryAdapter,
          domain: 'portfolio',
          execute: () => {
            const holding =
              dependencies.funds.getSettingsSnapshot().holdingsByCode[input.code] ?? null
            if (holding === null || holding.units <= 0) return { ok: true }

            try {
              ensured = ensureFundLedger({ fundCode: input.code })
            } catch (error) {
              primaryError = error
              retryable = true
              status = 'portfolio-persistence-failed'
              return {
                ok: false,
                primaryError,
                recovery: 'required' as const,
                recoveryRoute: 'portfolio-then-funds' as const,
              }
            }
            if (!ensured.ok) {
              primaryError = ensured.error
              retryable = true
              status = 'portfolio-persistence-failed'
              return {
                ok: false,
                primaryError,
                recovery: 'required' as const,
                recoveryRoute: 'portfolio-then-funds' as const,
              }
            }
            return { ok: true }
          },
          unexpectedRecoveryRoute: 'portfolio-then-funds',
        }),
      ],
    })

    if (!result.ok) {
      const partialPersistence =
        result.failure.persistence === 'partial' ||
        (ensured !== undefined && !ensured.ok && ensured.partialPersistence)
      return coordinationResult({
        error: result.failure.primaryError ?? primaryError,
        fundCode: input.code,
        holding: previousSettings.holdingsByCode[input.code] ?? null,
        ledger: null,
        partialPersistence,
        portfolio: dependencies.portfolio.getPortfolio(),
        retryable,
        status,
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

    let primaryError: unknown
    let reason: 'funds-persistence-failed' | 'portfolio-persistence-failed' =
      'portfolio-persistence-failed'
    const result = runCompensatedCommit<FundDeletionRecoveryRoute>({
      recoveryRoutes: {
        none: [],
        'portfolio-only': ['portfolio'],
        'portfolio-then-funds': ['portfolio', 'funds'],
      },
      stages: [
        defineCompensatedStage<Portfolio, FundDeletionRecoveryRoute>({
          adapter: portfolioRecoveryAdapter,
          domain: 'portfolio',
          execute: () => {
            if (!hasPortfolioData) return { ok: true }
            const portfolioResult = deletePortfolioData(preview.fundCode, previousPortfolio)
            if (portfolioResult.ok) return { ok: true }
            primaryError = portfolioResult.error
            reason = 'portfolio-persistence-failed'
            return {
              ok: false,
              primaryError,
              recovery: 'required' as const,
              recoveryRoute: 'portfolio-only' as const,
            }
          },
          unexpectedRecoveryRoute: 'portfolio-only',
        }),
        defineCompensatedStage<FundSettings, FundDeletionRecoveryRoute>({
          adapter: fundsRecoveryAdapter,
          domain: 'funds',
          execute: () => {
            if (currentFund === undefined) return { ok: true }
            const fundsResult = dependencies.funds.deleteFund(preview.fundCode)
            if (fundsResult.error === undefined) return { ok: true }
            primaryError = fundsResult.error
            reason = 'funds-persistence-failed'
            return {
              ok: false,
              primaryError,
              recovery: 'not-needed' as const,
              recoveryRoute: 'portfolio-only' as const,
            }
          },
          unexpectedRecoveryRoute: 'portfolio-then-funds',
        }),
      ],
    })

    if (!result.ok) {
      return {
        error: result.failure.primaryError ?? primaryError,
        funds: dependencies.funds.getSettingsSnapshot(),
        ok: false,
        partialPersistence: result.failure.persistence === 'partial',
        portfolio: dependencies.portfolio.getPortfolio(),
        reason,
        preview: currentPreview,
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
  ): { readonly ok: true } | { readonly ok: false; readonly error?: unknown } {
    for (const event of previous.events.filter(
      ({ fundCode: eventFundCode }) => eventFundCode === fundCode,
    )) {
      const result = dependencies.portfolio.deleteEvent(event.id)
      if (!result.ok) return { error: result.error, ok: false }
    }
    const result = dependencies.portfolio.disableFund(fundCode)
    if (!result.ok) return { error: result.error, ok: false }
    return { ok: true }
  }

  function synchronizeProjection(input: {
    readonly asOfDate: string
    readonly currentNavByFund: CurrentNavByFund
    readonly fundCode: string
    readonly previousPortfolio: Portfolio
    readonly previousSettings: FundSettings
  }): PortfolioCoordinationResult {
    return runProjectionCommit({
      executePortfolio: (state) =>
        calculateProjection(state, {
          asOfDate: input.asOfDate,
          currentNavByFund: input.currentNavByFund,
          fundCode: input.fundCode,
        }),
      fundCode: input.fundCode,
      holding: input.previousSettings.holdingsByCode[input.fundCode] ?? null,
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
