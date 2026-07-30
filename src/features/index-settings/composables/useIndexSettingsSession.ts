import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition'
import type { IndexSettingsSessionModel } from '../models/indexSettingsSessionModel'
import {
  generateGroupId,
  isGroupNameDuplicate,
  toDraftGroups,
  toIndexGroupDefinitions,
  validateGroupName,
  type DraftGroup,
} from '../models/settingsTypes'

interface IndexSettingsStore {
  readonly groups: readonly IndexGroupDefinition[]
  replaceGroups(groups: readonly IndexGroupDefinition[]): void
  saveGroups(groups: readonly IndexGroupDefinition[]): void
}

export function useIndexSettingsSession(
  store: IndexSettingsStore,
  isDesktop: MaybeRefOrGetter<boolean>,
) {
  const groups = ref<DraftGroup[]>([])
  const selectedGroupId = ref<string | null>(null)
  const mobileView = ref<'detail' | 'groups'>('groups')
  const initialSnapshot = ref<DraftGroup[]>([])

  const selectedGroup = computed(
    () => groups.value.find((group) => group.id === selectedGroupId.value) ?? null,
  )
  const isDirty = computed(() => !areGroupsEqual(groups.value, initialSnapshot.value))
  const model = computed<IndexSettingsSessionModel>(() => ({
    groups: groups.value,
    selectedGroup: selectedGroup.value,
    selectedGroupId: selectedGroupId.value,
    shell: {
      isDirty: isDirty.value,
      mobileView: mobileView.value,
      selectedGroupName: selectedGroup.value?.name ?? '',
    },
  }))

  watch(
    () => toValue(isDesktop),
    (desktop) => {
      if (!desktop) mobileView.value = 'groups'
    },
  )

  function open(): void {
    reset()
  }

  function reset(): void {
    initialSnapshot.value = toDraftGroups(store.groups)
    groups.value = toDraftGroups(store.groups)
    selectedGroupId.value = groups.value[0]?.id ?? null
    mobileView.value = 'groups'
  }

  function selectGroup(groupId: string): void {
    selectedGroupId.value = groupId
    if (!toValue(isDesktop)) mobileView.value = 'detail'
  }

  function returnToGroups(): void {
    mobileView.value = 'groups'
  }

  function addGroup(name: string): string | null {
    const normalizedName = name.trim()
    const validationError = validateGroupName(normalizedName)
    if (validationError) return validationError
    if (isGroupNameDuplicate(normalizedName, groups.value)) {
      return '分组名称不能重复'
    }

    const group = { id: generateGroupId(), name: normalizedName, quoteCodes: [] }
    groups.value.push(group)
    selectGroup(group.id)
    return null
  }

  function renameGroup(id: string, name: string): string | null {
    const group = groups.value.find((candidate) => candidate.id === id)
    if (!group) return '分组不存在'

    const normalizedName = name.trim()
    const validationError = validateGroupName(normalizedName)
    if (validationError) return validationError
    if (isGroupNameDuplicate(normalizedName, groups.value, id)) {
      return '分组名称不能重复'
    }

    group.name = normalizedName
    return null
  }

  function removeGroup(id: string): string | null {
    if (groups.value.length <= 1) return '至少保留一个分组'

    const groupIndex = groups.value.findIndex((group) => group.id === id)
    if (groupIndex < 0) return '分组不存在'

    groups.value.splice(groupIndex, 1)
    if (selectedGroupId.value === id) {
      selectedGroupId.value =
        groups.value[groupIndex]?.id ?? groups.value[groupIndex - 1]?.id ?? null
    }
    return null
  }

  function reorderGroups(fromIndex: number, toIndex: number): void {
    moveItem(groups.value, fromIndex, toIndex)
  }

  function addIndex(quoteCode: string): void {
    const group = selectedGroup.value
    if (group && !group.quoteCodes.includes(quoteCode)) group.quoteCodes.push(quoteCode)
  }

  function removeIndex(quoteCode: string): void {
    const group = selectedGroup.value
    if (!group) return
    const quoteCodeIndex = group.quoteCodes.indexOf(quoteCode)
    if (quoteCodeIndex >= 0) group.quoteCodes.splice(quoteCodeIndex, 1)
  }

  function reorderIndices(fromIndex: number, toIndex: number): void {
    const group = selectedGroup.value
    if (group) moveItem(group.quoteCodes, fromIndex, toIndex)
  }

  function commit(): string | null {
    if (!isDirty.value) return null
    if (groups.value.length === 0) return '至少保留一个分组'

    const nextGroups = toIndexGroupDefinitions(groups.value)
    try {
      store.saveGroups(nextGroups)
    } catch {
      return '保存设置失败，请检查浏览器存储空间后重试'
    }

    store.replaceGroups(nextGroups)
    initialSnapshot.value = toDraftGroups(groups.value)
    return null
  }

  reset()

  return {
    addGroup,
    addIndex,
    commit,
    model,
    open,
    removeGroup,
    removeIndex,
    renameGroup,
    reorderGroups,
    reorderIndices,
    reset,
    returnToGroups,
    selectGroup,
  }
}

function areGroupsEqual(first: readonly DraftGroup[], second: readonly DraftGroup[]): boolean {
  return (
    first.length === second.length &&
    first.every(
      (group, index) =>
        group.id === second[index]?.id &&
        group.name === second[index]?.name &&
        group.quoteCodes.length === second[index]?.quoteCodes.length &&
        group.quoteCodes.every(
          (quoteCode, quoteCodeIndex) => quoteCode === second[index]?.quoteCodes[quoteCodeIndex],
        ),
    )
  )
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): void {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return
  }

  const [item] = items.splice(fromIndex, 1)
  if (item !== undefined) items.splice(toIndex, 0, item)
}
