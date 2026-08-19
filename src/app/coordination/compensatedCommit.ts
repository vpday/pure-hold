import type {
  CoordinationDomain,
  CoordinationFailureFact,
  CoordinationPersistence,
} from './coordinationFailure.ts'

export type RecoveryAttempt =
  | { readonly ok: true }
  | { readonly ok: false; readonly error?: unknown }

export interface DomainRecoveryAdapter<Snapshot> {
  readonly capture: () => Snapshot
  readonly restore: (snapshot: Snapshot) => RecoveryAttempt
}

export type CompensatedStageAttempt<Route extends string> =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly primaryError?: unknown
      readonly recovery: 'not-needed' | 'required'
      readonly recoveryRoute: Route
    }

export interface CompensatedStageDefinition<Snapshot, Route extends string> {
  readonly adapter: DomainRecoveryAdapter<Snapshot>
  readonly domain: CoordinationDomain
  readonly execute: () => CompensatedStageAttempt<Route>
  readonly unexpectedRecoveryRoute: Route
}

interface CompensatedStageRun<Route extends string> {
  readonly capture: () => void
  readonly execute: () => CompensatedStageAttempt<Route>
  readonly restore: () => RecoveryAttempt
}

export interface CompensatedStage<Route extends string> {
  readonly createRun: () => CompensatedStageRun<Route>
  readonly domain: CoordinationDomain
  readonly unexpectedRecoveryRoute: Route
}

export interface CompensatedCommitPlan<Route extends string> {
  readonly recoveryRoutes: Readonly<Record<Route, readonly CoordinationDomain[]>>
  readonly stages: readonly CompensatedStage<Route>[]
}

export type CompensatedCommitResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: CoordinationFailureFact }

export function defineCompensatedStage<Snapshot, Route extends string>(
  definition: CompensatedStageDefinition<Snapshot, Route>,
): CompensatedStage<Route> {
  if (!isRecord(definition)) throw new TypeError('Compensated stage definition must be an object')
  if (!isCoordinationDomain(definition.domain)) {
    throw new TypeError('Compensated stage definition has an invalid domain')
  }
  if (
    !isRecord(definition.adapter) ||
    typeof definition.adapter.capture !== 'function' ||
    typeof definition.adapter.restore !== 'function'
  ) {
    throw new TypeError('Compensated stage definition has an invalid recovery adapter')
  }
  if (typeof definition.execute !== 'function') {
    throw new TypeError('Compensated stage definition has no execute function')
  }
  if (typeof definition.unexpectedRecoveryRoute !== 'string') {
    throw new TypeError('Compensated stage definition has no unexpected recovery route')
  }

  return {
    createRun: () => {
      let captured = false
      let snapshot: Snapshot | undefined

      return {
        capture: () => {
          snapshot = definition.adapter.capture()
          captured = true
        },
        execute: definition.execute,
        restore: () => {
          if (!captured) {
            throw new Error(`Cannot restore uncaptured ${definition.domain} snapshot`)
          }
          return definition.adapter.restore(snapshot as Snapshot)
        },
      }
    },
    domain: definition.domain,
    unexpectedRecoveryRoute: definition.unexpectedRecoveryRoute,
  }
}

export function runCompensatedCommit<Route extends string>(
  plan: CompensatedCommitPlan<Route>,
): CompensatedCommitResult {
  validatePlan(plan)

  const runs: CompensatedStageRun<Route>[] = []
  try {
    for (const stage of plan.stages) runs.push(stage.createRun())
  } catch (error) {
    return failureResult('unchanged', error, [])
  }

  for (const run of runs) {
    try {
      run.capture()
    } catch (error) {
      return failureResult('unchanged', error, [])
    }
  }

  for (const [index, stage] of plan.stages.entries()) {
    const run = runs[index]
    let attempt: unknown
    try {
      attempt = run.execute()
    } catch (error) {
      return compensate(plan, runs, getRoute(plan, stage.unexpectedRecoveryRoute), error)
    }

    if (isSuccessfulStageAttempt(attempt)) continue

    const failure = resolveStageFailure(plan, stage, attempt)
    return compensate(plan, runs, failure.route, failure.primaryError)
  }

  return { ok: true }
}

function compensate<Route extends string>(
  plan: CompensatedCommitPlan<Route>,
  runs: readonly CompensatedStageRun<Route>[],
  route: readonly CoordinationDomain[],
  primaryError: unknown,
): CompensatedCommitResult {
  const recoveryErrors: unknown[] = []
  const runsByDomain = new Map<CoordinationDomain, CompensatedStageRun<Route>>()

  for (const [index, stage] of plan.stages.entries()) {
    runsByDomain.set(stage.domain, runs[index])
  }

  for (const domain of route) {
    const run = runsByDomain.get(domain)
    if (run === undefined) {
      recoveryErrors.push(new Error(`No captured run exists for ${domain}`))
      continue
    }
    try {
      const attempt = run.restore()
      if (!isSuccessfulRecoveryAttempt(attempt)) {
        recoveryErrors.push(
          isFailedRecoveryAttempt(attempt)
            ? attempt.error
            : new TypeError('Invalid recovery attempt'),
        )
      }
    } catch (error) {
      recoveryErrors.push(error)
    }
  }

  const persistence: CoordinationPersistence =
    route.length === 0 ? 'unchanged' : recoveryErrors.length === 0 ? 'restored' : 'partial'
  return failureResult(persistence, primaryError, recoveryErrors)
}

function resolveStageFailure<Route extends string>(
  plan: CompensatedCommitPlan<Route>,
  stage: CompensatedStage<Route>,
  attempt: unknown,
): {
  readonly primaryError?: unknown
  readonly route: readonly CoordinationDomain[]
} {
  const fallbackRoute = getRoute(plan, stage.unexpectedRecoveryRoute)
  const routeError = new TypeError(`Invalid recovery result for ${stage.domain} stage`)

  if (!isRecord(attempt) || attempt.ok !== false) {
    return { primaryError: routeError, route: fallbackRoute }
  }

  const primaryError = attempt.primaryError
  const hasPrimaryError = primaryError !== undefined
  const recoveryRoute = attempt.recoveryRoute
  if (
    (attempt.recovery !== 'not-needed' && attempt.recovery !== 'required') ||
    typeof recoveryRoute !== 'string' ||
    !hasOwn(plan.recoveryRoutes, recoveryRoute)
  ) {
    return {
      ...(hasPrimaryError ? { primaryError } : { primaryError: routeError }),
      route: fallbackRoute,
    }
  }

  const route = getRoute(plan, recoveryRoute)
  if (attempt.recovery === 'required' && !route.includes(stage.domain)) {
    return {
      ...(hasPrimaryError ? { primaryError } : { primaryError: routeError }),
      route: fallbackRoute,
    }
  }

  return { ...(hasPrimaryError ? { primaryError } : {}), route }
}

function validatePlan<Route extends string>(plan: CompensatedCommitPlan<Route>): void {
  if (!isRecord(plan)) throw new TypeError('Compensated commit plan must be an object')
  if (!Array.isArray(plan.stages) || plan.stages.length === 0) {
    throw new TypeError('Compensated commit plan must contain at least one stage')
  }
  if (!isRecord(plan.recoveryRoutes) || Array.isArray(plan.recoveryRoutes)) {
    throw new TypeError('Compensated commit plan must contain recovery routes')
  }

  const domains = new Set<CoordinationDomain>()
  for (const [index, stage] of plan.stages.entries()) {
    if (!isRecord(stage)) throw new TypeError(`Invalid compensated stage at index ${index}`)
    if (!isCoordinationDomain(stage.domain)) {
      throw new TypeError(`Invalid compensated stage domain at index ${index}`)
    }
    if (domains.has(stage.domain)) {
      throw new TypeError(`Duplicate compensated stage domain: ${stage.domain}`)
    }
    if (typeof stage.createRun !== 'function') {
      throw new TypeError(`Compensated stage ${stage.domain} cannot create a run`)
    }
    if (typeof stage.unexpectedRecoveryRoute !== 'string') {
      throw new TypeError(`Compensated stage ${stage.domain} has no unexpected recovery route`)
    }
    domains.add(stage.domain)
  }

  for (const [routeName, routeValue] of Object.entries(plan.recoveryRoutes)) {
    if (!Array.isArray(routeValue))
      throw new TypeError(`Recovery route ${routeName} must be an array`)
    const routeDomains = new Set<CoordinationDomain>()
    for (const domain of routeValue) {
      if (!isCoordinationDomain(domain)) {
        throw new TypeError(`Recovery route ${routeName} references an unknown domain`)
      }
      if (routeDomains.has(domain)) {
        throw new TypeError(`Recovery route ${routeName} contains duplicate domain ${domain}`)
      }
      if (!domains.has(domain)) {
        throw new TypeError(`Recovery route ${routeName} references a domain outside the plan`)
      }
      routeDomains.add(domain)
    }
  }

  for (const stage of plan.stages) {
    if (!hasOwn(plan.recoveryRoutes, stage.unexpectedRecoveryRoute)) {
      throw new TypeError(`Stage ${stage.domain} references an unknown unexpected recovery route`)
    }
    if (!getRoute(plan, stage.unexpectedRecoveryRoute).includes(stage.domain)) {
      throw new TypeError(
        `Unexpected recovery route for ${stage.domain} must include the stage domain`,
      )
    }
  }
}

function getRoute<Route extends string>(
  plan: CompensatedCommitPlan<Route>,
  routeName: string,
): readonly CoordinationDomain[] {
  return plan.recoveryRoutes[routeName as Route]
}

function failureResult(
  persistence: CoordinationPersistence,
  primaryError: unknown,
  recoveryErrors: readonly unknown[],
): CompensatedCommitResult {
  const failure: CoordinationFailureFact = {
    ...(primaryError !== undefined ? { primaryError } : {}),
    persistence,
    recoveryErrors: [...recoveryErrors],
  }
  return { failure, ok: false }
}

function isSuccessfulStageAttempt(value: unknown): value is { readonly ok: true } {
  return isRecord(value) && value.ok === true
}

function isSuccessfulRecoveryAttempt(value: unknown): value is { readonly ok: true } {
  return isRecord(value) && value.ok === true
}

function isFailedRecoveryAttempt(
  value: unknown,
): value is { readonly ok: false; readonly error?: unknown } {
  return isRecord(value) && value.ok === false
}

function isCoordinationDomain(value: unknown): value is CoordinationDomain {
  return value === 'funds' || value === 'portfolio' || value === 'index'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}
