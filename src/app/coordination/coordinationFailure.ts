export type CoordinationDomain = 'funds' | 'portfolio' | 'index'

export type CoordinationPersistence = 'unchanged' | 'restored' | 'partial'

export interface CoordinationFailureFact {
  readonly persistence: CoordinationPersistence
  readonly primaryError?: unknown
  readonly recoveryErrors: readonly unknown[]
}

export function createCoordinationFailureFact(
  persistence: CoordinationPersistence,
  primaryError?: unknown,
  recoveryErrors: readonly unknown[] = [],
): CoordinationFailureFact {
  return {
    ...(primaryError === undefined ? {} : { primaryError }),
    persistence,
    recoveryErrors: [...recoveryErrors],
  }
}

export function aggregateCoordinationFailureFacts(
  facts: readonly (CoordinationFailureFact | undefined)[],
): CoordinationFailureFact | undefined {
  const definedFacts = facts.filter((fact): fact is CoordinationFailureFact => fact !== undefined)
  if (definedFacts.length === 0) return undefined

  const persistence: CoordinationPersistence = definedFacts.some(
    ({ persistence: value }) => value === 'partial',
  )
    ? 'partial'
    : definedFacts.some(({ persistence: value }) => value === 'restored')
      ? 'restored'
      : 'unchanged'
  const primaryError = definedFacts.find(
    ({ primaryError: value }) => value !== undefined,
  )?.primaryError
  const recoveryErrors = definedFacts.flatMap(({ recoveryErrors: errors }) => errors)

  return createCoordinationFailureFact(persistence, primaryError, recoveryErrors)
}
