import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defineCompensatedStage,
  runCompensatedCommit,
  type CompensatedCommitPlan,
  type CompensatedStageAttempt,
} from './compensatedCommit.ts'

type Route = 'none' | 'portfolio-funds' | 'funds-portfolio-index' | 'all'

interface HarnessStage {
  readonly domain: 'funds' | 'portfolio' | 'index'
  readonly snapshot: string
  readonly capture?: () => string
  readonly execute: () => CompensatedStageAttempt<Route>
  readonly restore?: (
    snapshot: string,
  ) => { readonly ok: true } | { readonly ok: false; readonly error?: unknown }
}

function createPlan(
  stages: readonly HarnessStage[],
  routes: Readonly<Record<Route, readonly ('funds' | 'portfolio' | 'index')[]>>,
): CompensatedCommitPlan<Route> {
  const activeDomains = new Set(stages.map(({ domain }) => domain))
  const scopedRoutes = Object.fromEntries(
    Object.entries(routes).map(([route, domains]) => [
      route,
      domains.filter((domain) => activeDomains.has(domain)),
    ]),
  ) as unknown as Readonly<Record<Route, readonly ('funds' | 'portfolio' | 'index')[]>>

  return {
    recoveryRoutes: scopedRoutes,
    stages: stages.map(({ capture, domain, execute, restore, snapshot }) =>
      defineCompensatedStage({
        adapter: {
          capture: () => {
            log.push(`capture:${domain}`)
            return capture?.() ?? snapshot
          },
          restore: (value) => {
            if (restore !== undefined) return restore(value)
            log.push(`restore:${domain}:${value}`)
            return { ok: true }
          },
        },
        domain,
        execute: () => {
          log.push(`execute:${domain}`)
          return execute()
        },
        unexpectedRecoveryRoute: 'all',
      }),
    ),
  }
}

let log: string[] = []

const allRoutes: Readonly<Record<Route, readonly ('funds' | 'portfolio' | 'index')[]>> = {
  all: ['funds', 'portfolio', 'index'],
  'funds-portfolio-index': ['funds', 'portfolio', 'index'],
  none: [],
  'portfolio-funds': ['portfolio', 'funds'],
}

test('captures every stage before executing the first stage', () => {
  log = []
  const result = runCompensatedCommit(
    createPlan(
      [
        { domain: 'funds', execute: () => ({ ok: true }), snapshot: 'funds-1' },
        { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
        { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
      ],
      allRoutes,
    ),
  )

  assert.deepEqual(log, [
    'capture:funds',
    'capture:portfolio',
    'capture:index',
    'execute:funds',
    'execute:portfolio',
    'execute:index',
  ])
  assert.deepEqual(result, { ok: true })
})

test('stops before later captures when an earlier capture throws', () => {
  log = []
  const captureError = new Error('portfolio read failed')
  const plan = createPlan(
    [
      { domain: 'funds', execute: () => ({ ok: true }), snapshot: 'funds-1' },
      {
        capture: () => {
          throw captureError
        },
        domain: 'portfolio',
        execute: () => ({ ok: true }),
        snapshot: 'portfolio-1',
      },
      { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
    ],
    allRoutes,
  )

  const result = runCompensatedCommit(plan)

  assert.deepEqual(log, ['capture:funds', 'capture:portfolio'])
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.failure.persistence, 'unchanged')
    assert.equal(result.failure.primaryError, captureError)
    assert.deepEqual(result.failure.recoveryErrors, [])
  }
})

test('does not recover after a successful commit', () => {
  log = []
  const result = runCompensatedCommit(
    createPlan(
      [
        { domain: 'funds', execute: () => ({ ok: true }), snapshot: 'funds-1' },
        { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
      ],
      allRoutes,
    ),
  )

  assert.deepEqual(log, [
    'capture:funds',
    'capture:portfolio',
    'execute:funds',
    'execute:portfolio',
  ])
  assert.deepEqual(result, { ok: true })
})

test('returns unchanged when a stage selects an empty route', () => {
  log = []
  const result = runCompensatedCommit(
    createPlan(
      [
        {
          domain: 'funds',
          execute: () => ({ ok: false, recovery: 'not-needed', recoveryRoute: 'none' }),
          snapshot: 'funds-1',
        },
        { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
      ],
      allRoutes,
    ),
  )

  assert.deepEqual(log, ['capture:funds', 'capture:portfolio', 'execute:funds'])
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure.persistence, 'unchanged')
})

test('uses the named route in its declared order instead of reversing stages', () => {
  log = []
  const result = runCompensatedCommit(
    createPlan(
      [
        { domain: 'funds', execute: () => ({ ok: true }), snapshot: 'funds-1' },
        {
          domain: 'portfolio',
          execute: () => ({ ok: false, recovery: 'required', recoveryRoute: 'portfolio-funds' }),
          snapshot: 'portfolio-1',
        },
        { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
      ],
      allRoutes,
    ),
  )

  assert.deepEqual(log, [
    'capture:funds',
    'capture:portfolio',
    'capture:index',
    'execute:funds',
    'execute:portfolio',
    'restore:portfolio:portfolio-1',
    'restore:funds:funds-1',
  ])
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure.persistence, 'restored')
})

test('allows different failures in one plan to choose different routes', () => {
  const makeRun = (failure: CompensatedStageAttempt<Route>) => {
    log = []
    const result = runCompensatedCommit(
      createPlan(
        [
          { domain: 'funds', execute: () => ({ ok: true }), snapshot: 'funds-1' },
          { domain: 'portfolio', execute: () => failure, snapshot: 'portfolio-1' },
          { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
        ],
        allRoutes,
      ),
    )
    return { log: [...log], result }
  }

  const portfolioRoute = makeRun({
    ok: false,
    recovery: 'required',
    recoveryRoute: 'portfolio-funds',
  })
  const allRoute = makeRun({
    ok: false,
    recovery: 'required',
    recoveryRoute: 'funds-portfolio-index',
  })

  assert.deepEqual(portfolioRoute.log.slice(-2), [
    'restore:portfolio:portfolio-1',
    'restore:funds:funds-1',
  ])
  assert.deepEqual(allRoute.log.slice(-3), [
    'restore:funds:funds-1',
    'restore:portfolio:portfolio-1',
    'restore:index:index-1',
  ])
  assert.equal(portfolioRoute.result.ok, false)
  assert.equal(allRoute.result.ok, false)
})

test('falls back to the unexpected route when required recovery omits the failed stage', () => {
  log = []
  const result = runCompensatedCommit(
    createPlan(
      [
        {
          domain: 'funds',
          execute: () => ({ ok: false, recovery: 'required', recoveryRoute: 'none' }),
          snapshot: 'funds-1',
        },
        { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
        { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
      ],
      allRoutes,
    ),
  )

  assert.deepEqual(log, [
    'capture:funds',
    'capture:portfolio',
    'capture:index',
    'execute:funds',
    'restore:funds:funds-1',
    'restore:portfolio:portfolio-1',
    'restore:index:index-1',
  ])
  assert.equal(result.ok, false)
})

test('continues recovery after a returned recovery failure', () => {
  log = []
  const plan = createPlan(
    [
      {
        domain: 'funds',
        execute: () => ({
          ok: false,
          recovery: 'required',
          recoveryRoute: 'funds-portfolio-index',
        }),
        snapshot: 'funds-1',
        restore: (value) => {
          log.push(`restore:funds:${value}`)
          return { error: new Error('funds restore failed'), ok: false }
        },
      },
      { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
      { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
    ],
    allRoutes,
  )

  const result = runCompensatedCommit(plan)

  assert.deepEqual(log.slice(-3), [
    'restore:funds:funds-1',
    'restore:portfolio:portfolio-1',
    'restore:index:index-1',
  ])
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.failure.persistence, 'partial')
    assert.equal(result.failure.recoveryErrors.length, 1)
  }
})

test('continues recovery after a thrown recovery failure and preserves each error', () => {
  log = []
  const restoreError = new Error('portfolio restore failed')
  const plan = createPlan(
    [
      {
        domain: 'funds',
        execute: () => ({
          ok: false,
          recovery: 'required',
          recoveryRoute: 'funds-portfolio-index',
        }),
        snapshot: 'funds-1',
      },
      {
        domain: 'portfolio',
        execute: () => ({ ok: true }),
        restore: () => {
          log.push('restore:portfolio:portfolio-1')
          throw restoreError
        },
        snapshot: 'portfolio-1',
      },
      { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
    ],
    allRoutes,
  )

  const result = runCompensatedCommit(plan)

  assert.deepEqual(log.slice(-3), [
    'restore:funds:funds-1',
    'restore:portfolio:portfolio-1',
    'restore:index:index-1',
  ])
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.failure.persistence, 'partial')
    assert.deepEqual(result.failure.recoveryErrors, [restoreError])
  }
})

test('classifies all successful recovery as restored and any failed recovery as partial', () => {
  log = []
  const recoveryError = new Error('index restore failed')
  const restored = runCompensatedCommit(
    createPlan(
      [
        {
          domain: 'funds',
          execute: () => ({
            ok: false,
            recovery: 'required',
            recoveryRoute: 'funds-portfolio-index',
          }),
          snapshot: 'funds-1',
        },
        { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
        { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
      ],
      allRoutes,
    ),
  )
  assert.equal(restored.ok, false)
  if (!restored.ok) assert.equal(restored.failure.persistence, 'restored')

  const partial = runCompensatedCommit(
    createPlan(
      [
        {
          domain: 'funds',
          execute: () => ({
            ok: false,
            recovery: 'required',
            recoveryRoute: 'funds-portfolio-index',
          }),
          snapshot: 'funds-1',
        },
        { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
        {
          domain: 'index',
          execute: () => ({ ok: true }),
          restore: () => ({ error: recoveryError, ok: false }),
          snapshot: 'index-1',
        },
      ],
      allRoutes,
    ),
  )
  assert.equal(partial.ok, false)
  if (!partial.ok) {
    assert.equal(partial.failure.persistence, 'partial')
    assert.deepEqual(partial.failure.recoveryErrors, [recoveryError])
  }
})

test('rejects invalid plans before any capture', () => {
  for (const invalidPlan of [
    { stages: [], recoveryRoutes: allRoutes },
    {
      stages: [
        defineCompensatedStage({
          adapter: { capture: () => 'funds', restore: () => ({ ok: true }) },
          domain: 'funds',
          execute: () => ({ ok: true }),
          unexpectedRecoveryRoute: 'all' as const,
        }),
        defineCompensatedStage({
          adapter: { capture: () => 'funds-2', restore: () => ({ ok: true }) },
          domain: 'funds',
          execute: () => ({ ok: true }),
          unexpectedRecoveryRoute: 'all' as const,
        }),
      ],
      recoveryRoutes: allRoutes,
    },
    {
      stages: [
        defineCompensatedStage({
          adapter: {
            capture: () => {
              throw new Error('must not capture')
            },
            restore: () => ({ ok: true }),
          },
          domain: 'funds',
          execute: () => ({ ok: true }),
          unexpectedRecoveryRoute: 'all' as const,
        }),
      ],
      recoveryRoutes: { ...allRoutes, all: ['funds', 'funds'] },
    },
    {
      stages: [
        defineCompensatedStage({
          adapter: {
            capture: () => {
              throw new Error('must not capture')
            },
            restore: () => ({ ok: true }),
          },
          domain: 'funds',
          execute: () => ({ ok: true }),
          unexpectedRecoveryRoute: 'all' as const,
        }),
      ],
      recoveryRoutes: { ...allRoutes, all: ['funds', 'portfolio'] },
    },
  ] as unknown[]) {
    assert.throws(
      () => runCompensatedCommit(invalidPlan as CompensatedCommitPlan<Route>),
      TypeError,
    )
  }
})

test('uses the unexpected route and primary error when execution throws', () => {
  log = []
  const executionError = new Error('write failed')
  const result = runCompensatedCommit(
    createPlan(
      [
        {
          domain: 'funds',
          execute: () => {
            throw executionError
          },
          snapshot: 'funds-1',
        },
        { domain: 'portfolio', execute: () => ({ ok: true }), snapshot: 'portfolio-1' },
        { domain: 'index', execute: () => ({ ok: true }), snapshot: 'index-1' },
      ],
      allRoutes,
    ),
  )

  assert.deepEqual(log.slice(-3), [
    'restore:funds:funds-1',
    'restore:portfolio:portfolio-1',
    'restore:index:index-1',
  ])
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure.primaryError, executionError)
})

test('captures a fresh snapshot for every serial run of one plan', () => {
  log = []
  let currentValue = 'before-first-run'
  let executionCount = 0
  const plan = createPlan(
    [
      {
        capture: () => currentValue,
        domain: 'funds',
        execute: () => {
          executionCount += 1
          if (executionCount === 1) currentValue = 'after-first-run'
          return { ok: false, recovery: 'required', recoveryRoute: 'funds-portfolio-index' }
        },
        restore: (value) => {
          log.push(`restore:${value}`)
          return { ok: true }
        },
        snapshot: 'unused',
      },
    ],
    allRoutes,
  )

  runCompensatedCommit(plan)
  runCompensatedCommit(plan)

  assert.deepEqual(log, [
    'capture:funds',
    'execute:funds',
    'restore:before-first-run',
    'capture:funds',
    'execute:funds',
    'restore:after-first-run',
  ])
})
