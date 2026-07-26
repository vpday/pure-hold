import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition'

export interface FundGroupDraft {
  id: string
  name: string
  fundCodes: string[]
}

export function validateFundGroupName(name: string): string | null {
  const normalized = name.trim()
  if (normalized.length === 0) {
    return '请输入分组名称'
  }
  if ([...normalized].length > 20) {
    return '分组名称不能超过 20 个字符'
  }
  return null
}

export function isFundGroupNameDuplicate(
  name: string,
  groups: readonly FundGroupDraft[],
  excludeId?: string,
): boolean {
  const normalized = name.trim()
  return groups.some((group) => group.id !== excludeId && group.name === normalized)
}

export function toFundGroupDrafts(groups: readonly FundGroupDefinition[]): FundGroupDraft[] {
  return groups.map((group) => ({
    fundCodes: [...group.fundCodes],
    id: group.id,
    name: group.name,
  }))
}

export function toFundGroupDefinitions(groups: readonly FundGroupDraft[]): FundGroupDefinition[] {
  return groups.map((group) => ({
    fundCodes: [...group.fundCodes],
    id: group.id,
    name: group.name,
  }))
}

export function moveFundGroup(groups: FundGroupDraft[], fromIndex: number, toIndex: number): void {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= groups.length ||
    toIndex >= groups.length ||
    fromIndex === toIndex
  ) {
    return
  }
  const [group] = groups.splice(fromIndex, 1)
  if (group) {
    groups.splice(toIndex, 0, group)
  }
}
