import type { IndexGroupDefinition } from '../models/indexGroupDefinition.ts'
import {
  validateIndexGroups,
  type IndexGroupsValidationIssue,
} from '../models/validateIndexGroups.ts'

export type CommitIndexGroupsResult =
  | { readonly ok: true; readonly groups: readonly IndexGroupDefinition[] }
  | {
      readonly ok: false
      readonly reason: 'invalid-groups'
      readonly issue: IndexGroupsValidationIssue
    }
  | { readonly ok: false; readonly reason: 'persistence-failed'; readonly error: unknown }

interface IndexSettingsCommandDependencies {
  readonly knownQuoteCodes: ReadonlySet<string>
  readonly persist: (groups: readonly IndexGroupDefinition[]) => void
  readonly apply: (groups: readonly IndexGroupDefinition[]) => void
}

export interface IndexSettingsCommandModule {
  commitReplace(groups: readonly IndexGroupDefinition[]): CommitIndexGroupsResult
}

export function createIndexSettingsCommandModule(
  dependencies: IndexSettingsCommandDependencies,
): IndexSettingsCommandModule {
  function commitReplace(groups: readonly IndexGroupDefinition[]): CommitIndexGroupsResult {
    const validation = validateIndexGroups(groups, dependencies.knownQuoteCodes)
    if (!validation.ok) {
      return { issue: validation.issue, ok: false, reason: 'invalid-groups' }
    }

    try {
      dependencies.persist(validation.groups)
    } catch (error) {
      return { error, ok: false, reason: 'persistence-failed' }
    }

    dependencies.apply(validation.groups)
    return { groups: validation.groups, ok: true }
  }

  return { commitReplace }
}
