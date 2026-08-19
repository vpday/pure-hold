import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aggregateCoordinationFailureFacts,
  createCoordinationFailureFact,
} from './coordinationFailure.ts'

test('aggregates persistence precedence, first primary error and all recovery errors', () => {
  const primaryError = new Error('primary')
  const firstRecoveryError = new Error('first recovery')
  const secondRecoveryError = new Error('second recovery')

  const result = aggregateCoordinationFailureFacts([
    createCoordinationFailureFact('unchanged', primaryError),
    createCoordinationFailureFact('restored', undefined, [firstRecoveryError]),
    createCoordinationFailureFact('partial', new Error('later primary'), [secondRecoveryError]),
  ])

  assert.deepEqual(result, {
    persistence: 'partial',
    primaryError,
    recoveryErrors: [firstRecoveryError, secondRecoveryError],
  })
  assert.notEqual(result?.recoveryErrors, [firstRecoveryError, secondRecoveryError])
})

test('returns no fact when every input is absent', () => {
  assert.equal(aggregateCoordinationFailureFacts([undefined, undefined]), undefined)
})
