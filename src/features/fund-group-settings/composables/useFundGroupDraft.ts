import { computed, ref } from 'vue'

import { useFundsStore } from '../../../domains/funds/stores/useFundsStore.ts'
import {
  isFundGroupNameDuplicate,
  moveFundGroup,
  toFundGroupDefinitions,
  toFundGroupDrafts,
  validateFundGroupName,
  type FundGroupDraft,
} from '../models/fundGroupDraft.ts'

export function useFundGroupDraft() {
  const store = useFundsStore()
  const groups = ref<FundGroupDraft[]>([])
  let initialGroups: FundGroupDraft[] = []

  const isDirty = computed(() => JSON.stringify(groups.value) !== JSON.stringify(initialGroups))

  function reset(): void {
    initialGroups = toFundGroupDrafts(store.groups)
    groups.value = toFundGroupDrafts(store.groups)
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
    return null
  }

  function reorderGroups(fromIndex: number, toIndex: number): void {
    moveFundGroup(groups.value, fromIndex, toIndex)
  }

  function commit(): { error?: string } {
    if (!isDirty.value) {
      return {}
    }
    const result = store.replaceGroups(toFundGroupDefinitions(groups.value))
    if (!result.error) {
      initialGroups = toFundGroupDrafts(store.groups)
    }
    return result
  }

  reset()
  return { addGroup, commit, groups, isDirty, removeGroup, renameGroup, reorderGroups, reset }
}
