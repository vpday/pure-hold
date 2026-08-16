import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const source = await readFile(
  new URL('./components/FundHoldingEditor.vue', import.meta.url),
  'utf8',
)

test('uses TDesign form controls for holding facts and preserves group selection', () => {
  assert.match(source, /<t-form/)
  assert.match(source, /<t-form-item/)
  assert.match(source, /<t-input-number/)
  assert.match(source, /<t-date-picker/)
  assert.match(source, /<t-radio-group/)
  assert.match(source, /<t-select[\s\S]*multiple/)
  assert.match(source, /<template #label>[\s\S]*<t-button[\s\S]*changeMode/)
  assert.match(source, /disablePurchaseDate/)
  assert.match(source, /formatLocalDate\(date\)/)
  assert.match(source, /defineExpose\(\{ validate \}\)/)
})
