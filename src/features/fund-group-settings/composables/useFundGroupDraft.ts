import { computed, ref } from 'vue'

import { useFundsStore } from '../../../domains/funds/stores/useFundsStore.ts'
import {
  isFundGroupNameDuplicate,
  moveFundCode,
  moveFundGroup,
  toFundGroupDefinitions,
  toFundGroupDrafts,
  validateFundGroupName,
  type FundGroupDraft,
} from '../models/fundGroupDraft.ts'

export function useFundGroupDraft() {
  const store = useFundsStore()
  const groups = ref<FundGroupDraft[]>([])
  const fundOrder = ref<string[]>([])
  const holdingOrder = ref<string[]>([])
  const selectedCategoryId = ref('all')
  let initialGroups: FundGroupDraft[] = []
  let initialFundOrder: string[] = []
  let initialHoldingOrder: string[] = []

  const isDirty = computed(
    () =>
      JSON.stringify(groups.value) !== JSON.stringify(initialGroups) ||
      JSON.stringify(fundOrder.value) !== JSON.stringify(initialFundOrder) ||
      JSON.stringify(holdingOrder.value) !== JSON.stringify(initialHoldingOrder),
  )
  const selectedCategoryName = computed(() => {
    if (selectedCategoryId.value === 'all') return '全部'
    if (selectedCategoryId.value === 'holdings') return '持仓'
    return groups.value.find(({ id }) => id === selectedCategoryId.value)?.name ?? '全部'
  })
  const selectedFundCodes = computed<readonly string[]>(() => {
    if (selectedCategoryId.value === 'all') return fundOrder.value
    if (selectedCategoryId.value === 'holdings') return holdingOrder.value
    return (
      groups.value.find(({ id }) => id === selectedCategoryId.value)?.fundCodes ?? fundOrder.value
    )
  })

  function reset(): void {
    initialGroups = toFundGroupDrafts(store.groups)
    initialFundOrder = [...store.fundOrder]
    initialHoldingOrder = [...store.holdingOrder]
    groups.value = toFundGroupDrafts(store.groups)
    fundOrder.value = [...store.fundOrder]
    holdingOrder.value = [...store.holdingOrder]
    selectedCategoryId.value = 'all'
  }

  function addGroup(name: string): string | null {
    const normalized = name.trim()
    const error = validateFundGroupName(normalized)
    if (error) {
      return error
    }
    if (isFundGroupNameDuplicate(normalized, groups.value)) {
      return '分组名称不能重复'
    }
    groups.value.push({ fundCodes: [], id: crypto.randomUUID(), name: normalized })
    return null
  }

  function renameGroup(id: string, name: string): string | null {
    const group = groups.value.find((candidate) => candidate.id === id)
    if (!group) {
      return '分组不存在'
    }
    const normalized = name.trim()
    const error = validateFundGroupName(normalized)
    if (error) {
      return error
    }
    if (isFundGroupNameDuplicate(normalized, groups.value, id)) {
      return '分组名称不能重复'
    }
    group.name = normalized
    return null
  }

  function removeGroup(id: string): string | null {
    const index = groups.value.findIndex((group) => group.id === id)
    if (index < 0) {
      return '分组不存在'
    }
    groups.value.splice(index, 1)
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = 'all'
    }
    return null
  }

  function reorderGroups(fromIndex: number, toIndex: number): void {
    moveFundGroup(groups.value, fromIndex, toIndex)
  }

  function reorderFunds(categoryId: string, fromIndex: number, toIndex: number): void {
    if (categoryId === 'all') {
      moveFundCode(fundOrder.value, fromIndex, toIndex)
      return
    }
    if (categoryId === 'holdings') {
      moveFundCode(holdingOrder.value, fromIndex, toIndex)
      return
    }
    const group = groups.value.find(({ id }) => id === categoryId)
    if (group) {
      moveFundCode(group.fundCodes, fromIndex, toIndex)
    }
  }

  function commit(): { error?: string; reorderedCategoryIds: readonly string[] } {
    const reorderedCategoryIds = findReorderedCategoryIds()
    if (!isDirty.value) {
      return { reorderedCategoryIds }
    }
    const result = store.replaceFundOrganization({
      fundOrder: fundOrder.value,
      groups: toFundGroupDefinitions(groups.value),
      holdingOrder: holdingOrder.value,
    })
    if (!result.error) {
      initialFundOrder = [...store.fundOrder]
      initialGroups = toFundGroupDrafts(store.groups)
      initialHoldingOrder = [...store.holdingOrder]
    }
    return { ...result, reorderedCategoryIds }
  }

  function findReorderedCategoryIds(): string[] {
    const reordered: string[] = []
    if (JSON.stringify(fundOrder.value) !== JSON.stringify(initialFundOrder)) {
      reordered.push('all')
    }
    if (JSON.stringify(holdingOrder.value) !== JSON.stringify(initialHoldingOrder)) {
      reordered.push('holdings')
    }

    const currentGroupsById = new Map(groups.value.map((group) => [group.id, group]))
    for (const initialGroup of initialGroups) {
      const currentGroup = currentGroupsById.get(initialGroup.id)
      if (
        !currentGroup ||
        JSON.stringify(currentGroup.fundCodes) !== JSON.stringify(initialGroup.fundCodes)
      ) {
        reordered.push(initialGroup.id)
      }
    }
    return reordered
  }

  reset()
  return {
    addGroup,
    commit,
    fundOrder,
    groups,
    holdingOrder,
    isDirty,
    removeGroup,
    renameGroup,
    reorderFunds,
    reorderGroups,
    reset,
    selectedCategoryId,
    selectedCategoryName,
    selectedFundCodes,
  }
}
