import type { IndexGroupDefinition } from './indexGroupDefinition.ts'

export const maximumIndexGroupNameLength = 20

export type IndexGroupsValidationIssue =
  | { readonly code: 'empty-groups' }
  | { readonly code: 'invalid-group-id'; readonly groupIndex: number }
  | {
      readonly code: 'duplicate-group-id'
      readonly groupId: string
      readonly groupIndex: number
    }
  | { readonly code: 'empty-group-name'; readonly groupId: string; readonly groupIndex: number }
  | {
      readonly code: 'non-canonical-group-name'
      readonly groupId: string
      readonly groupIndex: number
    }
  | {
      readonly code: 'group-name-too-long'
      readonly groupId: string
      readonly groupIndex: number
    }
  | {
      readonly code: 'duplicate-group-name'
      readonly groupId: string
      readonly groupIndex: number
      readonly groupName: string
    }
  | {
      readonly code: 'invalid-quote-code'
      readonly groupId: string
      readonly groupIndex: number
      readonly quoteIndex: number
    }
  | {
      readonly code: 'unknown-quote-code'
      readonly groupId: string
      readonly groupIndex: number
      readonly quoteCode: string
      readonly quoteIndex: number
    }
  | {
      readonly code: 'duplicate-quote-code'
      readonly groupId: string
      readonly groupIndex: number
      readonly quoteCode: string
      readonly quoteIndex: number
    }

export type IndexGroupsValidationResult =
  | { readonly ok: true; readonly groups: readonly IndexGroupDefinition[] }
  | { readonly ok: false; readonly issue: IndexGroupsValidationIssue }

export function validateIndexGroups(
  groups: readonly IndexGroupDefinition[],
  knownQuoteCodes: ReadonlySet<string>,
): IndexGroupsValidationResult {
  if (groups.length === 0) {
    return { issue: { code: 'empty-groups' }, ok: false }
  }

  const groupIds = new Set<string>()
  const groupNames = new Set<string>()
  const clonedGroups: IndexGroupDefinition[] = []

  for (const [groupIndex, group] of groups.entries()) {
    if (typeof group.id !== 'string' || group.id.trim().length === 0) {
      return { issue: { code: 'invalid-group-id', groupIndex }, ok: false }
    }
    if (groupIds.has(group.id)) {
      return {
        issue: { code: 'duplicate-group-id', groupId: group.id, groupIndex },
        ok: false,
      }
    }
    groupIds.add(group.id)

    if (typeof group.name !== 'string' || group.name.trim().length === 0) {
      return {
        issue: { code: 'empty-group-name', groupId: group.id, groupIndex },
        ok: false,
      }
    }
    if (group.name !== group.name.trim()) {
      return {
        issue: { code: 'non-canonical-group-name', groupId: group.id, groupIndex },
        ok: false,
      }
    }
    if ([...group.name].length > maximumIndexGroupNameLength) {
      return {
        issue: { code: 'group-name-too-long', groupId: group.id, groupIndex },
        ok: false,
      }
    }
    if (groupNames.has(group.name)) {
      return {
        issue: {
          code: 'duplicate-group-name',
          groupId: group.id,
          groupIndex,
          groupName: group.name,
        },
        ok: false,
      }
    }
    groupNames.add(group.name)

    const quoteCodes = new Set<string>()
    for (const [quoteIndex, quoteCode] of group.quoteCodes.entries()) {
      if (typeof quoteCode !== 'string') {
        return {
          issue: { code: 'invalid-quote-code', groupId: group.id, groupIndex, quoteIndex },
          ok: false,
        }
      }
      if (!knownQuoteCodes.has(quoteCode)) {
        return {
          issue: {
            code: 'unknown-quote-code',
            groupId: group.id,
            groupIndex,
            quoteCode,
            quoteIndex,
          },
          ok: false,
        }
      }
      if (quoteCodes.has(quoteCode)) {
        return {
          issue: {
            code: 'duplicate-quote-code',
            groupId: group.id,
            groupIndex,
            quoteCode,
            quoteIndex,
          },
          ok: false,
        }
      }
      quoteCodes.add(quoteCode)
    }

    clonedGroups.push({ id: group.id, name: group.name, quoteCodes: [...group.quoteCodes] })
  }

  return { groups: clonedGroups, ok: true }
}
