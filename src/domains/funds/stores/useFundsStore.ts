import { defineStore } from 'pinia'
import { onScopeDispose, shallowRef } from 'vue'

import type { FundAddition } from '../models/fundAddition.ts'
import type { FundGroupDefinition } from '../models/fundGroupDefinition.ts'
import type { FundHolding } from '../models/fundHolding.ts'
import type { FundSettings } from '../models/fundSettings.ts'
import { loadFundSettings } from '../services/persistence/loadFundSettings.ts'
import { saveFundSettings } from '../services/persistence/saveFundSettings.ts'
import { createFundMarketRuntime } from './createFundMarketRuntime.ts'
import {
  createFundSettingsCommandModule,
  type FundSettingsCommandFailure,
} from './createFundSettingsCommandModule.ts'

export const useFundsStore = defineStore('funds', () => {
  const settingsCommands = createFundSettingsCommandModule(loadFundSettings(), saveFundSettings)
  const initialSettings = settingsCommands.getSettings()
  const fundOrder = shallowRef<readonly string[]>(initialSettings.funds.map(({ code }) => code))
  const groups = shallowRef<readonly FundGroupDefinition[]>(initialSettings.groups)
  const holdingOrder = shallowRef<readonly string[]>(initialSettings.holdingOrder)
  const holdingsByCode = shallowRef<Readonly<Record<string, FundHolding>>>(
    initialSettings.holdingsByCode,
  )
  const marketRuntime = createFundMarketRuntime({
    getFundCodes: () => fundOrder.value,
    initialFunds: initialSettings.funds,
    syncObservedNames: (names) => settingsCommands.syncObservedNames(names).ok,
  })

  onScopeDispose(marketRuntime.dispose)

  function refreshAll(options?: { readonly force?: boolean }): Promise<void> {
    return marketRuntime.refreshAll(options)
  }

  function addFunds(additions: readonly FundAddition[]): { error?: string } {
    const result = settingsCommands.commit({ additions, kind: 'add-funds' })
    if (!result.ok) {
      return { error: addFundsError(result.reason) }
    }
    applySettings(result.settings)
    marketRuntime.applySettingsEffect(result.effect)
    return {}
  }

  function deleteFund(code: string): { error?: string } {
    const result = settingsCommands.commit({ code, kind: 'delete-fund' })
    if (!result.ok) {
      return { error: '删除失败，未能保存基金数据' }
    }
    if (result.effect) {
      applySettings(result.settings)
      marketRuntime.applySettingsEffect(result.effect)
    }
    return {}
  }

  function replaceGroups(nextGroups: readonly FundGroupDefinition[]): { error?: string } {
    const result = settingsCommands.commit({ groups: nextGroups, kind: 'replace-groups' })
    if (!result.ok) {
      return { error: '分组保存失败，请稍后重试' }
    }
    applySettings(result.settings)
    marketRuntime.applySettingsEffect(result.effect)
    return {}
  }

  function replaceFundOrganization(input: {
    readonly fundOrder: readonly string[]
    readonly groups: readonly FundGroupDefinition[]
    readonly holdingOrder: readonly string[]
  }): { error?: string } {
    const result = settingsCommands.commit({ ...input, kind: 'replace-fund-organization' })
    if (!result.ok) {
      return {
        error:
          result.reason === 'fund-data-changed'
            ? '基金数据已变化，请重新打开分组管理'
            : '分组排序保存失败，请稍后重试',
      }
    }
    applySettings(result.settings)
    marketRuntime.applySettingsEffect(result.effect)
    return {}
  }

  function updateFundHolding(holding: FundHolding): { error?: string } {
    const result = settingsCommands.commit({ holding, kind: 'update-fund-holding' })
    if (!result.ok) {
      return {
        error:
          result.reason === 'unknown-fund'
            ? '基金不存在，无法保存持仓信息'
            : '持仓保存失败，请稍后重试',
      }
    }
    applySettings(result.settings)
    marketRuntime.applySettingsEffect(result.effect)
    return {}
  }

  function updateFundGroupMembership(
    code: string,
    selectedGroupIds: ReadonlySet<string>,
  ): { error?: string } {
    const result = settingsCommands.commit({
      code,
      kind: 'update-fund-group-membership',
      selectedGroupIds,
    })
    if (!result.ok) {
      return {
        error:
          result.reason === 'unknown-fund'
            ? '基金不存在，无法保存基金分组'
            : result.reason === 'unknown-group'
              ? '所选基金分组不存在'
              : '基金分组保存失败，请稍后重试',
      }
    }
    applySettings(result.settings)
    marketRuntime.applySettingsEffect(result.effect)
    return {}
  }

  function applySettings(settings: FundSettings): void {
    fundOrder.value = settings.funds.map(({ code }) => code)
    groups.value = settings.groups
    holdingOrder.value = settings.holdingOrder
    holdingsByCode.value = settings.holdingsByCode
  }

  return {
    addFunds,
    deleteFund,
    fundOrder,
    groups,
    holdingOrder,
    holdingsByCode,
    isRefreshing: marketRuntime.isRefreshing,
    lastRefreshIssues: marketRuntime.lastRefreshIssues,
    lastRefreshSource: marketRuntime.lastRefreshSource,
    lastSuccessfulRefreshAt: marketRuntime.lastSuccessfulRefreshAt,
    previousSnapshotsByCode: marketRuntime.previousSnapshotsByCode,
    refreshAll,
    replaceFundOrganization,
    replaceGroups,
    snapshotsByCode: marketRuntime.snapshotsByCode,
    updateFundGroupMembership,
    updateFundHolding,
  }
})

function addFundsError(reason: FundSettingsCommandFailure): string {
  switch (reason) {
    case 'no-additions':
      return '请至少选择一只基金'
    case 'invalid-additions':
      return '所选基金包含重复或无效数据'
    default:
      return '添加失败，未能保存基金数据'
  }
}
