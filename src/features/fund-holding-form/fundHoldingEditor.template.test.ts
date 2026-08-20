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
  assert.match(source, /label="持仓金额"/)
  assert.match(source, /label="持仓收益"/)
  assert.match(source, /holdingFactsReadonly/)
  assert.match(source, /:readonly="holdingFactsReadonly"/)
  assert.match(source, /message="该基金已有成交记录/)
  assert.match(source, /<t-date-picker/)
  assert.match(source, /<t-radio-group/)
  assert.match(source, /<t-select[\s\S]*multiple/)
  assert.match(source, /<template #label>[\s\S]*<t-button[\s\S]*changeMode/)
  assert.match(source, /disablePurchaseDate/)
  assert.match(source, /holdingDaysFromPurchaseDate/)
  assert.match(source, /purchaseDateFromHoldingDays/)
  assert.match(source, /formatLocalDate\(date\)/)
  assert.match(source, /defineExpose\(\{ validate \}\)/)
})
