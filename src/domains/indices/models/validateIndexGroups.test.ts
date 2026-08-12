import assert from 'node:assert/strict'
import test from 'node:test'

import type { IndexGroupDefinition } from './indexGroupDefinition.ts'
import { validateIndexGroups } from './validateIndexGroups.ts'

const knownQuoteCodes = new Set(['index-1', 'index-2'])

test('validateIndexGroups returns a detached clone for valid groups', () => {
  const groups = [{ id: 'group-a', name: '分组一', quoteCodes: ['index-1'] }]
  const result = validateIndexGroups(groups, knownQuoteCodes)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.groups, groups)
  assert.notEqual(result.groups, groups)
  assert.notEqual(result.groups[0]?.quoteCodes, groups[0]?.quoteCodes)
})

const invalidCases: readonly [string, readonly IndexGroupDefinition[], string][] = [
  ['empty settings', [], 'empty-groups'],
  ['empty group id', [{ id: ' ', name: '分组', quoteCodes: [] }], 'invalid-group-id'],
  [
    'duplicate group id',
    [
      { id: 'same', name: '分组一', quoteCodes: [] },
      { id: 'same', name: '分组二', quoteCodes: [] },
    ],
    'duplicate-group-id',
  ],
  ['empty name', [{ id: 'group', name: '', quoteCodes: [] }], 'empty-group-name'],
  [
    'non-canonical name',
    [{ id: 'group', name: ' 分组 ', quoteCodes: [] }],
    'non-canonical-group-name',
  ],
  [
    'too-long name',
    [{ id: 'group', name: '一'.repeat(21), quoteCodes: [] }],
    'group-name-too-long',
  ],
  [
    'duplicate name',
    [
      { id: 'group-a', name: '同名', quoteCodes: [] },
      { id: 'group-b', name: '同名', quoteCodes: [] },
    ],
    'duplicate-group-name',
  ],
  [
    'unknown quote code',
    [{ id: 'group', name: '分组', quoteCodes: ['missing'] }],
    'unknown-quote-code',
  ],
  [
    'duplicate quote code',
    [{ id: 'group', name: '分组', quoteCodes: ['index-1', 'index-1'] }],
    'duplicate-quote-code',
  ],
]

for (const [name, groups, expectedCode] of invalidCases) {
  test(`validateIndexGroups rejects ${name} without repairing it`, () => {
    const result = validateIndexGroups(groups, knownQuoteCodes)
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.issue.code, expectedCode)
  })
}
