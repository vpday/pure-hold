import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const source = await readFile(new URL('./FundHoldingCorrectionDialog.vue', import.meta.url), 'utf8')

test('uses official TDesign controls for the auditable correction form', () => {
  for (const control of [
    't-form',
    't-input-number',
    't-textarea',
    't-date-picker',
    't-alert',
    't-button',
  ]) {
    assert.match(source, new RegExp(`<${control}`))
  }
  assert.match(source, /目标份额/)
  assert.match(source, /目标总成本/)
  assert.match(source, /修正原因/)
  assert.match(source, /事件日期/)
})
