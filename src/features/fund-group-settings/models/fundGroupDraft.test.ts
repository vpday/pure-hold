import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isFundGroupNameDuplicate,
  moveFundGroup,
  toFundGroupDefinitions,
  toFundGroupDrafts,
  validateFundGroupName,
  type FundGroupDraft,
} from './fundGroupDraft.ts'

test('fund group draft validates trim, empty, length and duplicates', () => {
  const groups: FundGroupDraft[] = [{ fundCodes: [], id: 'a', name: '成长' }]
  assert.equal(validateFundGroupName('   '), '请输入分组名称')
  assert.match(validateFundGroupName('甲'.repeat(21)) ?? '', /20/)
  assert.equal(validateFundGroupName(' 价值 '), null)
  assert.equal(isFundGroupNameDuplicate(' 成长 ', groups), true)
  assert.equal(isFundGroupNameDuplicate('成长', groups, 'a'), false)
})

test('fund group draft clones, removes and reorders without changing fund relations', () => {
  const definitions = [
    { fundCodes: ['a'], id: 'one', name: '一组' },
    { fundCodes: [], id: 'two', name: '二组' },
  ]
  const draft = toFundGroupDrafts(definitions)
  moveFundGroup(draft, 0, 1)
  assert.deepEqual(
    draft.map((group) => group.id),
    ['two', 'one'],
  )
  draft.splice(0, 1)
  assert.deepEqual(toFundGroupDefinitions(draft), [{ fundCodes: ['a'], id: 'one', name: '一组' }])
  assert.deepEqual(definitions[0]?.fundCodes, ['a'])
})
