import assert from 'node:assert/strict'
import test from 'node:test'

import { removeFundSelection, toggleFundSelection } from './fundSelectionDraft.ts'

test('selection keeps first-selection order, deduplicates and appends after reselecting', () => {
  const one = { code: '000001', name: '一号' }
  const two = { code: '000002', name: '二号' }
  let selection = toggleFundSelection([], one)
  selection = toggleFundSelection(selection, two)
  assert.deepEqual(selection, [one, two])

  selection = toggleFundSelection(selection, one)
  assert.deepEqual(selection, [two])
  selection = toggleFundSelection(selection, one)
  assert.deepEqual(selection, [two, one])
  assert.deepEqual(removeFundSelection(selection, '000002'), [one])
})
