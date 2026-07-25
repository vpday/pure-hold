import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition'

export interface DraftGroup {
  id: string
  name: string
  quoteCodes: string[]
}

export interface SettingsDraft {
  groups: DraftGroup[]
  selectedGroupId: string | null
}

const maximumGroupNameLength = 20

export function validateGroupName(name: string): string | null {
  const normalizedName = name.trim()
  if (normalizedName.length === 0) {
    return '请输入分组名称'
  }

  if ([...normalizedName].length > maximumGroupNameLength) {
    return `分组名称不能超过 ${maximumGroupNameLength} 个字符`
  }

  return null
}

export function isGroupNameDuplicate(
  name: string,
  groups: readonly DraftGroup[],
  excludeId?: string,
): boolean {
  const normalizedName = name.trim()
  return groups.some((group) => group.id !== excludeId && group.name.trim() === normalizedName)
}

export function generateGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `group-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function toDraftGroups(groups: readonly IndexGroupDefinition[]): DraftGroup[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    quoteCodes: [...group.quoteCodes],
  }))
}

export function toIndexGroupDefinitions(groups: readonly DraftGroup[]): IndexGroupDefinition[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    quoteCodes: [...group.quoteCodes],
  }))
}
