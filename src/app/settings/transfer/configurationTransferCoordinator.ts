import {
  defineCompensatedStage,
  runCompensatedCommit,
  type CompensatedStage,
  type CompensatedStageAttempt,
} from '@/app/coordination/compensatedCommit.ts'
import {
  createCoordinationFailureFact,
  type CoordinationDomain,
  type CoordinationFailureFact,
} from '@/app/coordination/coordinationFailure.ts'
import type { RebuildHoldingProjectionsResult } from '@/app/portfolio/portfolioCoordinator.ts'
import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition.ts'
import type { CommitIndexGroupsResult } from '@/domains/indices/services/createIndexSettingsCommandModule.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import type { ConfigurationTransferPackage } from './configurationTransfer.ts'
import {
  createFundsRecoveryAdapter,
  createIndexRecoveryAdapter,
  createPortfolioRecoveryAdapter,
} from './configurationRecoveryAdapters.ts'
import type { PortfolioTransferResult } from './portfolioTransfer.ts'

export interface ConfigurationTransferStoreAdapters {
  readonly getIndexGroups: () => readonly IndexGroupDefinition[]
  readonly commitIndexGroups: (groups: readonly IndexGroupDefinition[]) => CommitIndexGroupsResult
  readonly getFundSettings: () => FundSettings
  readonly replaceFundSettings: (settings: FundSettings) => ConfigurationTransferReplaceResult
  readonly getPortfolio?: () => Portfolio
  readonly replacePortfolio?: (portfolio: Portfolio) => PortfolioTransferResult
  readonly rebuildHoldingProjections?: () => RebuildHoldingProjectionsResult
}

export interface ConfigurationTransferSelection {
  readonly index: boolean
  readonly funds: boolean
  readonly portfolio?: boolean
}

export type ConfigurationTransferReplaceResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly failure?: CoordinationFailureFact
      readonly reason: string
    }

export type ConfigurationTransferCommitResult =
  | { readonly ok: true; readonly rebuild?: RebuildHoldingProjectionsResult }
  | {
      readonly ok: false
      readonly failure?: CoordinationFailureFact
      readonly rebuild?: RebuildHoldingProjectionsResult
      readonly reason: string
    }

type ConfigurationRecoveryRoute =
  | 'none'
  | 'index-only'
  | 'portfolio-index'
  | 'funds-portfolio-index'
  | 'portfolio-funds-index'

export function createConfigurationTransferCoordinator(
  adapters: ConfigurationTransferStoreAdapters,
) {
  function commitImport(
    packageValue: ConfigurationTransferPackage,
    selection: ConfigurationTransferSelection,
  ): ConfigurationTransferCommitResult {
    const portfolioSelected = selection.portfolio === true
    if (!selection.index && !selection.funds && !portfolioSelected) {
      return { ok: false, reason: '未选择任何配置分区' }
    }
    if (selection.index && packageValue.index === undefined) {
      return { ok: false, reason: '导入包中没有可用的指数配置' }
    }
    if (selection.funds && packageValue.funds === undefined) {
      return { ok: false, reason: '导入包中没有可用的基金配置' }
    }
    if (portfolioSelected && packageValue.portfolio === undefined) {
      return { ok: false, reason: '导入包中没有可用的投资账本' }
    }
    if (portfolioSelected && adapters.replacePortfolio === undefined) {
      return { ok: false, reason: '投资账本传输暂不可用' }
    }
    if (portfolioSelected && adapters.getPortfolio === undefined) {
      return { ok: false, reason: '投资账本配置暂不可用' }
    }
    if (portfolioSelected && adapters.rebuildHoldingProjections === undefined) {
      return { ok: false, reason: '投资账本恢复后无法重建持仓信息' }
    }

    const metadataFundSettings =
      portfolioSelected && !selection.funds ? adapters.getFundSettings() : undefined
    if (portfolioSelected) {
      const availableFundCodes = new Set(
        (selection.funds ? packageValue.funds! : metadataFundSettings!).funds.map(
          ({ code }) => code,
        ),
      )
      const missingFundCodes = portfolioFundCodes(packageValue.portfolio!).filter(
        (fundCode) => !availableFundCodes.has(fundCode),
      )
      if (missingFundCodes.length > 0) {
        return {
          ok: false,
          reason: `投资账本缺少基金元数据：${missingFundCodes.join('、')}`,
        }
      }
    }

    const activeDomains: CoordinationDomain[] = []
    if (selection.index) activeDomains.push('index')
    if (portfolioSelected) activeDomains.push('portfolio')
    if (selection.funds || portfolioSelected) activeDomains.push('funds')

    const recoveryRoutes = createRecoveryRoutes(activeDomains)
    const stages: CompensatedStage<ConfigurationRecoveryRoute>[] = []
    let rebuild: RebuildHoldingProjectionsResult | undefined
    let failureReason = '配置恢复失败'
    let fundsWriteFailed = false

    if (selection.index) {
      const indexAdapter = createIndexRecoveryAdapter({
        commitIndexGroups: adapters.commitIndexGroups,
        getIndexGroups: adapters.getIndexGroups,
      })
      stages.push(
        defineCompensatedStage<readonly IndexGroupDefinition[], ConfigurationRecoveryRoute>({
          adapter: indexAdapter,
          domain: 'index',
          execute: () => {
            const result = commitIndexGroups(packageValue.index!.groups)
            if (result.ok) return { ok: true }
            failureReason =
              result.reason === 'invalid-groups' ? '指数配置内容无效' : '指数配置保存失败'
            return stageFailure(
              result.reason === 'persistence-failed' ? result.error : undefined,
              'not-needed',
              'none',
            )
          },
          unexpectedRecoveryRoute: 'index-only',
        }),
      )
    }

    if (portfolioSelected) {
      const portfolioAdapter = createPortfolioRecoveryAdapter({
        getPortfolio: adapters.getPortfolio!,
        replacePortfolio: adapters.replacePortfolio!,
      })
      stages.push(
        defineCompensatedStage<Portfolio, ConfigurationRecoveryRoute>({
          adapter: portfolioAdapter,
          domain: 'portfolio',
          execute: () => {
            const result = replacePortfolio(packageValue.portfolio!)
            if (result.ok) return { ok: true }
            failureReason = portfolioFailureReason(result)
            const partial = result.failure?.persistence === 'partial'
            return stageFailure(
              result.failure?.primaryError,
              partial ? 'required' : 'not-needed',
              partial ? 'portfolio-index' : 'index-only',
            )
          },
          unexpectedRecoveryRoute: 'portfolio-index',
        }),
      )
    }

    if (selection.funds || portfolioSelected) {
      const fundsAdapter = createFundsRecoveryAdapter({
        getFundSettings: adapters.getFundSettings,
        replaceFundSettings: adapters.replaceFundSettings,
      })
      stages.push(
        defineCompensatedStage<FundSettings, ConfigurationRecoveryRoute>({
          adapter: fundsAdapter,
          domain: 'funds',
          execute: () => {
            if (selection.funds) {
              const result = replaceFundSettings(packageValue.funds!)
              if (!result.ok) {
                fundsWriteFailed = true
                const partial = result.failure?.persistence === 'partial'
                return stageFailure(
                  result.failure?.primaryError,
                  partial ? 'required' : 'not-needed',
                  partial ? 'funds-portfolio-index' : 'portfolio-index',
                )
              }
            }

            if (!portfolioSelected) return { ok: true }

            try {
              rebuild = adapters.rebuildHoldingProjections!()
            } catch (error) {
              failureReason = '投资账本恢复后持仓信息重建失败'
              return stageFailure(error, 'required', 'portfolio-funds-index')
            }
            if (rebuild.status !== 'synced' || rebuild.failure !== undefined) {
              const rebuildError = rebuild.failure?.primaryError
              failureReason =
                rebuild.status === 'pending'
                  ? '投资账本恢复后持仓信息仍待确认或精确数据'
                  : '投资账本恢复后持仓信息重建失败'
              return stageFailure(rebuildError, 'required', 'portfolio-funds-index')
            }

            return { ok: true }
          },
          unexpectedRecoveryRoute: 'portfolio-funds-index',
        }),
      )
    }

    const result = runCompensatedCommit({ recoveryRoutes, stages })
    if (result.ok) return portfolioSelected ? { ok: true, rebuild } : { ok: true }

    const failure = result.failure

    const reason =
      fundsWriteFailed && selection.index
        ? failure.persistence === 'restored'
          ? '基金配置保存失败，已恢复原指数配置'
          : '基金配置保存失败，指数配置可能已部分写入'
        : failureReason
    return {
      ...(rebuild !== undefined ? { rebuild } : {}),
      failure,
      ok: false,
      reason,
    }

    function stageFailure(
      primaryError: unknown,
      recovery: 'not-needed' | 'required',
      recoveryRoute: ConfigurationRecoveryRoute,
    ): CompensatedStageAttempt<ConfigurationRecoveryRoute> {
      return {
        ...(primaryError !== undefined ? { primaryError } : {}),
        ok: false,
        recovery,
        recoveryRoute,
      }
    }

    function commitIndexGroups(groups: readonly IndexGroupDefinition[]): CommitIndexGroupsResult {
      try {
        return adapters.commitIndexGroups(groups)
      } catch (error) {
        return { error, ok: false, reason: 'persistence-failed' }
      }
    }

    function replaceFundSettings(settings: FundSettings): ConfigurationTransferReplaceResult {
      try {
        return adapters.replaceFundSettings(settings)
      } catch (error) {
        return {
          failure: createCoordinationFailureFact('partial', error),
          ok: false,
          reason: 'persistence-failed',
        }
      }
    }

    function replacePortfolio(portfolio: Portfolio): PortfolioTransferResult {
      try {
        return adapters.replacePortfolio!(portfolio)
      } catch (error) {
        return {
          failure: createCoordinationFailureFact('partial', error),
          ok: false,
          reason: 'persistence-failed',
        }
      }
    }
  }

  return { commitImport }
}

function createRecoveryRoutes(
  activeDomains: readonly CoordinationDomain[],
): Readonly<Record<ConfigurationRecoveryRoute, readonly CoordinationDomain[]>> {
  const active = new Set(activeDomains)
  const filter = (route: readonly CoordinationDomain[]) =>
    route.filter((domain) => active.has(domain))
  return {
    'funds-portfolio-index': filter(['funds', 'portfolio', 'index']),
    'index-only': filter(['index']),
    none: [],
    'portfolio-funds-index': filter(['portfolio', 'funds', 'index']),
    'portfolio-index': filter(['portfolio', 'index']),
  }
}

function portfolioFundCodes(portfolio: Portfolio): string[] {
  const codes = new Set(portfolio.fundCodes)
  for (const event of portfolio.events) codes.add(event.fundCode)
  return [...codes].sort()
}

function portfolioFailureReason(
  result: Extract<PortfolioTransferResult, { readonly ok: false }>,
): string {
  if (result.reason === 'invalid-portfolio') return '投资账本内容无效'
  return '投资账本保存失败'
}
