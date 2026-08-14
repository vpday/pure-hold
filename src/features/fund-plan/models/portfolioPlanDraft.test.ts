import assert from 'node:assert/strict'
import test from 'node:test'

import { createPortfolioPlanDraft, submitPortfolioPlanDraft } from './portfolioPlanDraft.ts'

test('creates an empty manual plan draft without a first installment', () => {
  assert.deepEqual(createPortfolioPlanDraft(undefined, '000001', '2026-08-14'), {
    amountYuan: '',
    cycle: 'monthly',
    endDate: '',
    executionDay: '1',
    executionMode: 'manual',
    fundCode: '000001',
    purchaseFeePercent: '',
    startDate: '2026-08-14',
    status: 'active',
  })
})

test('validates a plan draft and preserves its stable ID when edited', () => {
  const draft = createPortfolioPlanDraft(
    {
      amountCents: 50_000,
      createdAt: '2026-08-01T09:00:00.000Z',
      cycle: 'monthly',
      executionDay: 31,
      executionMode: 'local-draft',
      fundCode: '000001',
      id: 'plan-1',
      startDate: '2026-08-01',
      status: 'paused',
      updatedAt: '2026-08-01T09:00:00.000Z',
    },
    '000001',
    '2026-08-14',
  )
  const result = submitPortfolioPlanDraft(
    { ...draft, amountYuan: '600.00', executionMode: 'manual', status: 'active' },
    { now: '2026-08-14T09:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.plan.id, 'plan-1')
  assert.equal(result.plan.amountCents, 60_000)
  assert.equal(result.plan.executionMode, 'manual')
  assert.equal(result.plan.status, 'active')
})

test('rejects invalid amount, execution day, dates, and fee rate', () => {
  const result = submitPortfolioPlanDraft(
    {
      amountYuan: '0',
      cycle: 'monthly',
      endDate: '2026-02-29',
      executionDay: '32',
      executionMode: 'manual',
      fundCode: '000001',
      purchaseFeePercent: '100.00001',
      startDate: '2026-03-01',
      status: 'active',
    },
    { now: '2026-08-14T09:00:00.000Z', today: '2026-08-14' },
  )
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(result.errors.amountYuan)
  assert.ok(result.errors.executionDay)
  assert.ok(result.errors.endDate)
  assert.ok(result.errors.purchaseFeePercent)
})
