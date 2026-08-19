export type CoordinationDomain = 'funds' | 'portfolio' | 'index'

export type CoordinationPersistence = 'unchanged' | 'restored' | 'partial'

export interface CoordinationFailureFact {
  readonly persistence: CoordinationPersistence
  readonly primaryError?: unknown
  readonly recoveryErrors: readonly unknown[]
}
