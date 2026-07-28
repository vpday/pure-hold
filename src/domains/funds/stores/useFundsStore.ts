import { defineStore } from 'pinia'
import { onScopeDispose, ref, shallowRef } from 'vue'

import type { FundAddition } from '../models/fundAddition.ts'
import { createEmptyFundSnapshot } from '../models/createEmptyFundSnapshot.ts'
import type { FundGroupDefinition } from '../models/fundGroupDefinition.ts'
import type { FundHolding } from '../models/fundHolding.ts'
import type { FundSnapshot } from '../models/fundSnapshot.ts'
import type { FundState } from '../models/fundState.ts'
import { loadFundState } from '../services/persistence/loadFundState.ts'
import { saveFundState } from '../services/persistence/saveFundState.ts'
import type { FundRefreshIssue } from '../services/tiantian/fundRefreshIssue.ts'
import { fetchTiantianFundSnapshots } from '../services/tiantian/fetchTiantianFundSnapshots.ts'
import { mergeFundRefreshResult } from './mergeFundRefreshResult.ts'

export const useFundsStore = defineStore('funds', () => {
  const initialState = loadFundState()
  const fundOrder = shallowRef<readonly string[]>(initialState.fundOrder)
  const groups = shallowRef<readonly FundGroupDefinition[]>(initialState.groups)
  const holdingOrder = shallowRef<readonly string[]>(initialState.holdingOrder)
  const holdingsByCode = shallowRef<Readonly<Record<string, FundHolding>>>(
    initialState.holdingsByCode,
  )
  const snapshotsByCode = shallowRef<Readonly<Record<string, FundSnapshot>>>(
    initialState.snapshotsByCode,
  )
  const isRefreshing = ref(false)
  const lastRefreshIssues = shallowRef<readonly FundRefreshIssue[]>([])
  const lastSuccessfulRefreshAt = ref<number | undefined>(
    latestFetchedAt(initialState.snapshotsByCode),
  )

  let activeController: AbortController | undefined
  let activeRefresh: Promise<void> | undefined
  let lifecycle = 0

  onScopeDispose(() => {
    lifecycle += 1
    activeController?.abort()
  })

  function refreshAll(): Promise<void> {
    if (activeRefresh) {
      return activeRefresh
    }

    return refreshCodes(fundOrder.value)
  }

  function refreshCodes(codes: readonly string[]): Promise<void> {
    if (activeRefresh) return activeRefresh
    const currentCodes = new Set(fundOrder.value)
    const requestedCodes = [...new Set(codes)].filter((code) => currentCodes.has(code))
    if (requestedCodes.length === 0) {
      lastRefreshIssues.value = []
      return Promise.resolve()
    }

    const currentLifecycle = lifecycle
    const controller = new AbortController()
    activeController = controller
    isRefreshing.value = true

    const request = fetchTiantianFundSnapshots(requestedCodes, controller.signal)
      .then((batch) => {
        if (currentLifecycle !== lifecycle) {
          return
        }
        const merged = mergeFundRefreshResult(
          snapshotsByCode.value,
          fundOrder.value,
          requestedCodes,
          batch,
        )
        lastRefreshIssues.value = merged.issues
        if (merged.updatedCount === 0) {
          return
        }

        snapshotsByCode.value = merged.snapshotsByCode
        lastSuccessfulRefreshAt.value = batch.fetchedAt
        try {
          saveFundState(currentState())
        } catch {
          lastRefreshIssues.value = [...merged.issues, { code: 'persistence-failed' as const }]
        }
      })
      .catch((error: unknown) => {
        if (currentLifecycle === lifecycle && !isAbortError(error)) {
          lastRefreshIssues.value = requestedCodes.map((fundCode) => ({
            code: 'request-failed',
            fundCode,
          }))
        }
      })
      .finally(() => {
        if (activeRefresh === request) {
          activeRefresh = undefined
          activeController = undefined
          isRefreshing.value = false
        }
      })

    activeRefresh = request
    return request
  }

  function addFunds(additions: readonly FundAddition[]): { error?: string } {
    if (additions.length === 0) {
      return { error: '请至少选择一只基金' }
    }
    const existingCodes = new Set(fundOrder.value)
    const batchCodes = new Set<string>()
    for (const addition of additions) {
      if (
        !/^\d{6}$/.test(addition.code) ||
        addition.name.trim().length === 0 ||
        existingCodes.has(addition.code) ||
        batchCodes.has(addition.code) ||
        (addition.holding !== undefined && addition.holding.code !== addition.code)
      ) {
        return { error: '所选基金包含重复或无效数据' }
      }
      batchCodes.add(addition.code)
    }

    const nextSnapshots = { ...snapshotsByCode.value }
    const nextHoldings = { ...holdingsByCode.value }
    for (const addition of additions) {
      nextSnapshots[addition.code] = createEmptyFundSnapshot(addition.code, addition.name.trim())
      if (addition.holding) nextHoldings[addition.code] = addition.holding
    }
    const candidate: FundState = {
      fundOrder: [...fundOrder.value, ...batchCodes],
      groups: groups.value,
      holdingOrder: [
        ...holdingOrder.value,
        ...additions.flatMap((addition) => (addition.holding ? [addition.code] : [])),
      ],
      holdingsByCode: nextHoldings,
      snapshotsByCode: nextSnapshots,
    }
    try {
      saveFundState(candidate)
    } catch {
      return { error: '添加失败，未能保存基金数据' }
    }
    applyState(candidate)
    void refreshCodes([...batchCodes])
    return {}
  }

  function deleteFund(code: string): { error?: string } {
    if (!fundOrder.value.includes(code)) {
      return {}
    }
    const nextSnapshots = { ...snapshotsByCode.value }
    const nextHoldings = { ...holdingsByCode.value }
    delete nextSnapshots[code]
    delete nextHoldings[code]
    const candidate: FundState = {
      fundOrder: fundOrder.value.filter((fundCode) => fundCode !== code),
      groups: groups.value.map((group) => ({
        ...group,
        fundCodes: group.fundCodes.filter((fundCode) => fundCode !== code),
      })),
      holdingOrder: holdingOrder.value.filter((fundCode) => fundCode !== code),
      holdingsByCode: nextHoldings,
      snapshotsByCode: nextSnapshots,
    }
    try {
      saveFundState(candidate)
    } catch {
      return { error: '删除失败，未能保存基金数据' }
    }
    applyState(candidate)
    return {}
  }

  function replaceGroups(nextGroups: readonly FundGroupDefinition[]): { error?: string } {
    const candidate: FundState = { ...currentState(), groups: nextGroups }
    try {
      saveFundState(candidate)
    } catch {
      return { error: '分组保存失败，请稍后重试' }
    }
    groups.value = candidate.groups
    return {}
  }

  function replaceFundOrganization(input: {
    readonly fundOrder: readonly string[]
    readonly groups: readonly FundGroupDefinition[]
    readonly holdingOrder: readonly string[]
  }): { error?: string } {
    if (
      !haveSameItems(input.fundOrder, fundOrder.value) ||
      !haveSameItems(input.holdingOrder, Object.keys(holdingsByCode.value))
    ) {
      return { error: '基金数据已变化，请重新打开分组管理' }
    }

    const candidate: FundState = {
      ...currentState(),
      fundOrder: [...input.fundOrder],
      groups: input.groups.map((group) => ({ ...group, fundCodes: [...group.fundCodes] })),
      holdingOrder: [...input.holdingOrder],
    }
    try {
      saveFundState(candidate)
    } catch {
      return { error: '分组排序保存失败，请稍后重试' }
    }
    fundOrder.value = candidate.fundOrder
    groups.value = candidate.groups
    holdingOrder.value = candidate.holdingOrder
    return {}
  }

  function updateFundHolding(holding: FundHolding): { error?: string } {
    if (!fundOrder.value.includes(holding.code)) {
      return { error: '基金不存在，无法保存持仓信息' }
    }
    const candidate: FundState = {
      ...currentState(),
      holdingOrder: holdingsByCode.value[holding.code]
        ? holdingOrder.value
        : [...holdingOrder.value, holding.code],
      holdingsByCode: { ...holdingsByCode.value, [holding.code]: holding },
    }
    try {
      saveFundState(candidate)
    } catch {
      return { error: '持仓保存失败，请稍后重试' }
    }
    holdingOrder.value = candidate.holdingOrder
    holdingsByCode.value = candidate.holdingsByCode
    return {}
  }

  function updateFundGroupMembership(
    code: string,
    selectedGroupIds: ReadonlySet<string>,
  ): { error?: string } {
    if (!fundOrder.value.includes(code)) {
      return { error: '基金不存在，无法保存基金分组' }
    }
    const knownGroupIds = new Set(groups.value.map(({ id }) => id))
    if ([...selectedGroupIds].some((id) => !knownGroupIds.has(id))) {
      return { error: '所选基金分组不存在' }
    }
    const candidate: FundState = {
      ...currentState(),
      groups: groups.value.map((group) => {
        const containsFund = group.fundCodes.includes(code)
        if (selectedGroupIds.has(group.id)) {
          return containsFund ? group : { ...group, fundCodes: [...group.fundCodes, code] }
        }
        return containsFund
          ? { ...group, fundCodes: group.fundCodes.filter((fundCode) => fundCode !== code) }
          : group
      }),
    }
    try {
      saveFundState(candidate)
    } catch {
      return { error: '基金分组保存失败，请稍后重试' }
    }
    groups.value = candidate.groups
    return {}
  }

  function currentState(): FundState {
    return {
      fundOrder: fundOrder.value,
      groups: groups.value,
      holdingOrder: holdingOrder.value,
      holdingsByCode: holdingsByCode.value,
      snapshotsByCode: snapshotsByCode.value,
    }
  }

  function applyState(state: FundState): void {
    lifecycle += 1
    activeController?.abort()
    activeController = undefined
    activeRefresh = undefined
    isRefreshing.value = false
    fundOrder.value = state.fundOrder
    groups.value = state.groups
    holdingOrder.value = state.holdingOrder
    holdingsByCode.value = state.holdingsByCode
    snapshotsByCode.value = state.snapshotsByCode
  }

  return {
    addFunds,
    deleteFund,
    fundOrder,
    groups,
    holdingOrder,
    holdingsByCode,
    isRefreshing,
    lastRefreshIssues,
    lastSuccessfulRefreshAt,
    refreshAll,
    replaceFundOrganization,
    replaceGroups,
    snapshotsByCode,
    updateFundGroupMembership,
    updateFundHolding,
  }
})

function haveSameItems(first: readonly string[], second: readonly string[]): boolean {
  return (
    first.length === second.length &&
    new Set(first).size === first.length &&
    first.every((item) => second.includes(item))
  )
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function latestFetchedAt(
  snapshotsByCode: Readonly<Record<string, FundSnapshot>>,
): number | undefined {
  const timestamps = Object.values(snapshotsByCode).flatMap((snapshot) =>
    snapshot.fetchedAt === null ? [] : [snapshot.fetchedAt],
  )
  return timestamps.length > 0 ? Math.max(...timestamps) : undefined
}
