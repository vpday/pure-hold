import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition.ts'
import type { CommitIndexGroupsResult } from '@/domains/indices/services/createIndexSettingsCommandModule.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import type { ConfigurationTransferPackage } from './configurationTransfer.ts'

export interface ConfigurationTransferStoreAdapters {
  readonly getIndexGroups: () => readonly IndexGroupDefinition[]
  readonly commitIndexGroups: (groups: readonly IndexGroupDefinition[]) => CommitIndexGroupsResult
  readonly getFundSettings: () => FundSettings
  readonly replaceFundSettings: (settings: FundSettings) => ConfigurationTransferReplaceResult
}

export interface ConfigurationTransferSelection {
  readonly index: boolean
  readonly funds: boolean
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
    if (!selection.index && !selection.funds) {
      return { ok: false, partialPersistence: false, reason: '未选择任何配置分区' }
    }
    if (selection.index && packageValue.index === undefined) {
      return { ok: false, partialPersistence: false, reason: '导入包中没有可用的指数配置' }
    }
    if (selection.funds && packageValue.funds === undefined) {
      return { ok: false, partialPersistence: false, reason: '导入包中没有可用的基金配置' }
    }

    const originalIndexGroups = selection.index ? adapters.getIndexGroups() : undefined
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
          const rollback = adapters.commitIndexGroups(originalIndexGroups)
          return {
            ok: false,
            partialPersistence: !rollback.ok,
            reason: rollback.ok
              ? '基金配置保存失败，已恢复原指数配置'
              : '基金配置保存失败，指数配置可能已部分写入',
          }
        }
        return { ok: false, partialPersistence: false, reason: '基金配置保存失败' }
      }
    }

    return { ok: true }
  }

  return { commitImport }
}
