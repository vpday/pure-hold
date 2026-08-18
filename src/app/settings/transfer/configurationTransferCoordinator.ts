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
}

export interface ConfigurationTransferSelection {
  readonly index: boolean
  readonly funds: boolean
  readonly portfolio?: boolean
}

export type ConfigurationTransferReplaceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

export type ConfigurationTransferCommitResult =
  | { readonly ok: true }
  | {
      readonly ok: false
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

    const originalIndexGroups = selection.index ? adapters.getIndexGroups() : undefined
    const originalFundSettings = selection.funds ? adapters.getFundSettings() : undefined
    const originalPortfolio = portfolioSelected ? adapters.getPortfolio?.() : undefined
    if (selection.index) {
      const result = adapters.commitIndexGroups(packageValue.index!.groups)
      if (!result.ok) {
        return {
          ok: false,
          partialPersistence: false,
          reason: result.reason === 'invalid-groups' ? '指数配置内容无效' : '指数配置保存失败',
        }
      }
    }

    if (selection.funds) {
      const result = adapters.replaceFundSettings(packageValue.funds!)
      if (!result.ok) {
        if (selection.index && originalIndexGroups !== undefined) {
          const rollback = rollbackEarlierSections({
            index: true,
            funds: false,
            originalIndexGroups,
            originalFundSettings,
          })
          return {
            ok: false,
            partialPersistence: !rollback,
            reason: rollback
              ? '基金配置保存失败，已恢复原指数配置'
              : '基金配置保存失败，指数配置可能已部分写入',
          }
        }
        return { ok: false, partialPersistence: false, reason: '基金配置保存失败' }
      }
    }

    if (portfolioSelected) {
      const result = adapters.replacePortfolio!(packageValue.portfolio!)
      if (!result.ok) {
        const portfolioRollback =
          result.partialPersistence && originalPortfolio !== undefined
            ? adapters.replacePortfolio!(originalPortfolio).ok
            : true
        const rollback = rollbackEarlierSections({
          index: selection.index,
          funds: selection.funds,
          originalIndexGroups,
          originalFundSettings,
        })
        return {
          ok: false,
          partialPersistence: (result.partialPersistence && !portfolioRollback) || !rollback,
          reason: portfolioFailureReason(result),
        }
      }
    }

    return { ok: true }

    function rollbackEarlierSections(input: {
      readonly index: boolean
      readonly funds: boolean
      readonly originalIndexGroups: readonly IndexGroupDefinition[] | undefined
      readonly originalFundSettings: FundSettings | undefined
    }): boolean {
      let ok = true
      if (input.funds && input.originalFundSettings !== undefined) {
        ok = adapters.replaceFundSettings(input.originalFundSettings).ok && ok
      }
      if (input.index && input.originalIndexGroups !== undefined) {
        ok = adapters.commitIndexGroups(input.originalIndexGroups).ok && ok
      }
      return ok
    }
  }

  return { commitImport }
}

function portfolioFailureReason(
  result: Extract<PortfolioTransferResult, { readonly ok: false }>,
): string {
  if (result.reason === 'invalid-portfolio') return '投资账本内容无效'
  return '投资账本保存失败'
}
