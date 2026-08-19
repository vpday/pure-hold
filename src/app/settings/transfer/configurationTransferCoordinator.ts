import type { RebuildHoldingProjectionsResult } from '@/app/portfolio/portfolioCoordinator.ts'
import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition.ts'
import type { CommitIndexGroupsResult } from '@/domains/indices/services/createIndexSettingsCommandModule.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import type { ConfigurationTransferPackage } from './configurationTransfer.ts'
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
      readonly error?: unknown
      readonly partialPersistence?: boolean
      readonly reason: string
    }

export type ConfigurationTransferCommitResult =
  | { readonly ok: true; readonly rebuild?: RebuildHoldingProjectionsResult }
  | {
      readonly ok: false
      readonly error?: unknown
      readonly rebuild?: RebuildHoldingProjectionsResult
      readonly reason: string
      readonly partialPersistence: boolean
    }

export function createConfigurationTransferCoordinator(
  adapters: ConfigurationTransferStoreAdapters,
) {
  function commitImport(
    packageValue: ConfigurationTransferPackage,
    selection: ConfigurationTransferSelection,
  ): ConfigurationTransferCommitResult {
    const portfolioSelected = selection.portfolio === true
    if (!selection.index && !selection.funds && !portfolioSelected) {
      return { ok: false, partialPersistence: false, reason: '未选择任何配置分区' }
    }
    if (selection.index && packageValue.index === undefined) {
      return { ok: false, partialPersistence: false, reason: '导入包中没有可用的指数配置' }
    }
    if (selection.funds && packageValue.funds === undefined) {
      return { ok: false, partialPersistence: false, reason: '导入包中没有可用的基金配置' }
    }
    if (portfolioSelected && packageValue.portfolio === undefined) {
      return { ok: false, partialPersistence: false, reason: '导入包中没有可用的投资账本' }
    }
    if (portfolioSelected && adapters.replacePortfolio === undefined) {
      return { ok: false, partialPersistence: false, reason: '投资账本传输暂不可用' }
    }
    if (portfolioSelected && adapters.getPortfolio === undefined) {
      return { ok: false, partialPersistence: false, reason: '投资账本快照暂不可用' }
    }
    if (portfolioSelected && adapters.rebuildHoldingProjections === undefined) {
      return { ok: false, partialPersistence: false, reason: '投资账本恢复后无法重建持仓信息' }
    }

    const originalIndexGroups = selection.index ? adapters.getIndexGroups() : undefined
    const originalFundSettings =
      selection.funds || portfolioSelected ? adapters.getFundSettings() : undefined
    const originalPortfolio = portfolioSelected ? adapters.getPortfolio!() : undefined
    if (portfolioSelected) {
      const availableFundCodes = new Set(
        (selection.funds ? packageValue.funds! : originalFundSettings!).funds.map(
          ({ code }) => code,
        ),
      )
      const missingFundCodes = portfolioFundCodes(packageValue.portfolio!).filter(
        (fundCode) => !availableFundCodes.has(fundCode),
      )
      if (missingFundCodes.length > 0) {
        return {
          ok: false,
          partialPersistence: false,
          reason: `投资账本缺少基金元数据：${missingFundCodes.join('、')}`,
        }
      }
    }

    if (selection.index) {
      const result = commitIndexGroups(packageValue.index!.groups)
      if (!result.ok) {
        return {
          ok: false,
          ...(result.reason === 'persistence-failed' ? { error: result.error } : {}),
          partialPersistence: false,
          reason: result.reason === 'invalid-groups' ? '指数配置内容无效' : '指数配置保存失败',
        }
      }
    }

    if (portfolioSelected) {
      const result = replacePortfolio(packageValue.portfolio!)
      if (!result.ok) {
        const portfolioRollback =
          result.partialPersistence && originalPortfolio !== undefined
            ? replacePortfolio(originalPortfolio).ok
            : true
        const rollback = rollbackSnapshot({
          funds: false,
          index: selection.index,
          portfolio: false,
        })
        return {
          ...(result.error !== undefined ? { error: result.error } : {}),
          ok: false,
          partialPersistence: (result.partialPersistence && !portfolioRollback) || !rollback,
          reason: portfolioFailureReason(result),
        }
      }
    }

    if (selection.funds) {
      const result = replaceFundSettings(packageValue.funds!)
      if (!result.ok) {
        const fundsRollback =
          result.partialPersistence && originalFundSettings !== undefined
            ? replaceFundSettings(originalFundSettings).ok
            : true
        const rollback = rollbackSnapshot({
          funds: false,
          index: selection.index,
          portfolio: portfolioSelected,
        })
        return {
          ...(result.error !== undefined ? { error: result.error } : {}),
          ok: false,
          partialPersistence: (result.partialPersistence && !fundsRollback) || !rollback,
          reason:
            selection.index && rollback
              ? '基金配置保存失败，已恢复原指数配置'
              : selection.index
                ? '基金配置保存失败，指数配置可能已部分写入'
                : '基金配置保存失败',
        }
      }
    }

    if (!portfolioSelected) return { ok: true }

    let rebuild: RebuildHoldingProjectionsResult
    try {
      rebuild = adapters.rebuildHoldingProjections!()
    } catch (error) {
      const rollback = rollbackSnapshot({
        funds: true,
        index: selection.index,
        portfolio: true,
      })
      return {
        error,
        ok: false,
        partialPersistence: !rollback,
        reason: '投资账本恢复后持仓信息重建失败',
      }
    }
    if (rebuild.status !== 'synced' || rebuild.partialPersistence) {
      const rebuildError = rebuild.results.find(({ error }) => error !== undefined)?.error
      const rollback = rollbackSnapshot({
        funds: true,
        index: selection.index,
        portfolio: true,
      })
      return {
        ...(rebuildError !== undefined ? { error: rebuildError } : {}),
        ok: false,
        partialPersistence: !rollback,
        rebuild,
        reason:
          rebuild.status === 'pending'
            ? '投资账本恢复后持仓信息仍待确认或精确数据'
            : '投资账本恢复后持仓信息重建失败',
      }
    }

    return { ok: true, rebuild }

    function rollbackSnapshot(input: {
      readonly funds: boolean
      readonly index: boolean
      readonly portfolio: boolean
    }): boolean {
      let ok = true
      if (input.portfolio && originalPortfolio !== undefined) {
        ok = replacePortfolio(originalPortfolio).ok && ok
      }
      if (input.funds && originalFundSettings !== undefined) {
        ok = replaceFundSettings(originalFundSettings).ok && ok
      }
      if (input.index && originalIndexGroups !== undefined) {
        ok = commitIndexGroups(originalIndexGroups).ok && ok
      }
      return ok
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
        return { error, ok: false, partialPersistence: true, reason: 'persistence-failed' }
      }
    }

    function replacePortfolio(portfolio: Portfolio): PortfolioTransferResult {
      try {
        return adapters.replacePortfolio!(portfolio)
      } catch (error) {
        return { error, ok: false, partialPersistence: true, reason: 'persistence-failed' }
      }
    }
  }

  return { commitImport }
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
