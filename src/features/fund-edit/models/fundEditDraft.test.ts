import assert from 'node:assert/strict'
import test from 'node:test'

import type { PortfolioCoordinationResult } from '@/app/portfolio/portfolioCoordinator.ts'
import { createEmptyPortfolio } from '@/domains/portfolio/services/persistence/loadPortfolio.ts'
import type { FundEditSubmitters } from './fundEditDraft.ts'
import {
  createFundEditDraft,
  hasSubsequentFundEvents,
  submitFundEditDraft,
} from './fundEditDraft.ts'

test('edit draft fills current holding and custom group memberships', () => {
  assert.deepEqual(
    createFundEditDraft(
      '000001',
      '测试基金',
      {
        code: '000001',
        dividendMode: 'cash',
        purchaseDate: '2020-01-01',
        totalCostCents: 3000,
        units: 20,
      },
      [
        { fundCodes: ['000001'], id: 'one', name: '一组' },
        { fundCodes: [], id: 'two', name: '二组' },
      ],
    ),
    {
      code: '000001',
      holding: {
        dividendMode: 'cash',
        holdingDays: '',
        purchaseDate: '2020-01-01',
        totalCostYuan: '30',
        timeMode: 'date',
        units: '20',
      },
      name: '测试基金',
      selectedGroupIds: ['one'],
    },
  )
})

test('reopening creates a fresh draft from the latest store values', () => {
  const groups = [{ fundCodes: ['000001'], id: 'one', name: '一组' }]
  const holding = {
    code: '000001',
    dividendMode: 'cash' as const,
    purchaseDate: '2020-01-01',
    totalCostCents: 1000,
    units: 10,
  }
  const first = createFundEditDraft('000001', '测试基金', holding, groups)
  first.holding.units = '99'
  first.selectedGroupIds = []

  const reopened = createFundEditDraft('000001', '测试基金', { ...holding, units: 20 }, groups)
  assert.equal(reopened.holding.units, '20')
  assert.deepEqual(reopened.selectedGroupIds, ['one'])
})

test('only locks holding facts after a subsequent fund event', () => {
  const fundCode = '000001'

  assert.equal(hasSubsequentFundEvents([], fundCode), false)
  assert.equal(hasSubsequentFundEvents([{ fundCode, kind: 'initial-holding' }], fundCode), false)
  assert.equal(
    hasSubsequentFundEvents(
      [
        { fundCode, kind: 'initial-holding' },
        { fundCode, kind: 'buy' },
      ],
      fundCode,
    ),
    true,
  )
  assert.equal(hasSubsequentFundEvents([{ fundCode: '000002', kind: 'buy' }], fundCode), false)
})

test('blank holding saves only groups and surfaces a direct group failure', () => {
  const draft = createFundEditDraft('000001', '测试基金', undefined, [])
  draft.selectedGroupIds = ['one']
  const calls: string[] = []
  const submitters = createSubmitters(calls)
  assert.deepEqual(submitFundEditDraft(draft, submitters), {
    fieldErrors: {},
    success: true,
  })
  assert.deepEqual(calls, ['groups:one'])

  const failedCalls: string[] = []
  const failed = submitFundEditDraft(draft, createSubmitters(failedCalls, true))
  assert.equal(failed.error, '分组失败')
  assert.deepEqual(failedCalls, ['groups:one'])
})

test('partial holding validates first and stops after holding failure', () => {
  const draft = createFundEditDraft('000001', '测试基金', undefined, [])
  draft.holding.units = '1'
  const calls: string[] = []
  const submitters = createSubmitters(calls)
  assert.equal(submitFundEditDraft(draft, submitters).success, false)
  assert.equal(calls.length, 0)

  fillValidHolding(draft)
  submitters.updateFundHolding = () => {
    calls.push('holding')
    return { error: '持仓失败' }
  }
  const result = submitFundEditDraft(draft, submitters, new Date(2026, 6, 27))
  assert.equal(result.error, '持仓失败')
  assert.deepEqual(calls, ['holding'])
})

test('reports a retryable ledger failure after the holding is persisted', () => {
  const draft = createFundEditDraft('000001', '测试基金', undefined, [])
  fillValidHolding(draft)
  const calls: string[] = []
  const submitters = createSubmitters(calls)
  submitters.ensureFundLedger = (code) => {
    calls.push(`ledger:${code}`)
    return {
      error: new Error('quota exceeded'),
      ok: false,
      partialPersistence: true,
      retryable: true,
    }
  }

  const result = submitFundEditDraft(draft, submitters, new Date(2026, 6, 27))

  assert.deepEqual(result, {
    error: '持仓信息已保存，但投资账本可能已部分持久化，请重试并检查账本',
    fieldErrors: {},
    holdingSaved: true,
    partialPersistence: true,
    reason: 'ledger-persistence-failed',
    retryable: true,
    success: false,
  })
  assert.deepEqual(calls, ['holding', 'ledger:000001'])
})

test('group failure reports partial success and every retry restarts from holding', () => {
  const draft = createFundEditDraft('000001', '测试基金', undefined, [])
  fillValidHolding(draft)
  draft.selectedGroupIds = ['one']
  const calls: string[] = []
  const submitters = createSubmitters(calls, true)

  const first = submitFundEditDraft(draft, submitters, new Date(2026, 6, 27))
  assert.deepEqual(first, {
    error: '持仓信息已保存，基金分组保存失败',
    fieldErrors: {},
    holdingSaved: true,
    success: false,
  })
  assert.deepEqual(calls, ['holding', 'groups:one'])
  submitFundEditDraft(draft, submitters, new Date(2026, 6, 27))
  assert.deepEqual(calls, ['holding', 'groups:one', 'holding', 'groups:one'])
})

test('successful submit preserves holding then group call order', () => {
  const draft = createFundEditDraft('000001', '测试基金', undefined, [])
  fillValidHolding(draft)
  const calls: string[] = []
  const submitters = createSubmitters(calls)
  submitters.ensureFundLedger = (code) => {
    calls.push(`ledger:${code}`)
    return { ok: true }
  }
  const result = submitFundEditDraft(draft, submitters, new Date(2026, 6, 27))
  assert.deepEqual(result, { fieldErrors: {}, success: true })
  assert.deepEqual(calls, ['holding', 'ledger:000001', 'groups:'])
})

test('submits numeric values emitted by the holding number inputs', () => {
  const draft = createFundEditDraft('000001', '测试基金', undefined, [])
  Object.assign(draft.holding, {
    dividendMode: 'cash',
    holdingDays: 1000,
    totalCostYuan: 0.89,
    timeMode: 'days',
    units: 6817.77,
  })
  const calls: string[] = []

  const result = submitFundEditDraft(draft, createSubmitters(calls), new Date(2026, 6, 27))

  assert.deepEqual(result, { fieldErrors: {}, success: true })
  assert.deepEqual(calls, ['holding', 'groups:'])
})

test('saves only metadata after a fund ledger has been created', () => {
  const draft = createFundEditDraft(
    '000001',
    '测试基金',
    {
      code: '000001',
      dividendMode: 'cash',
      purchaseDate: '2020-01-01',
      totalCostCents: 1000,
      units: 10,
    },
    [],
  )
  draft.holding.dividendMode = 'reinvest'
  const calls: string[] = []
  const result = submitFundEditDraft(
    draft,
    {
      holdingFactsReadonly: true,
      updateFundGroupMembership() {
        calls.push('groups')
        return {}
      },
      updateFundHolding() {
        calls.push('holding')
        return {}
      },
      updateHoldingMetadata(input) {
        calls.push(`metadata:${input.dividendMode}:${input.purchaseDate}`)
        return coordinationResult('pending-exact-data')
      },
    },
    new Date(2026, 6, 27),
  )

  assert.deepEqual(result, { fieldErrors: {}, status: 'pending-exact-data', success: true })
  assert.deepEqual(calls, ['metadata:reinvest:2020-01-01', 'groups'])
})

function fillValidHolding(draft: ReturnType<typeof createFundEditDraft>): void {
  Object.assign(draft.holding, {
    dividendMode: 'reinvest',
    purchaseDate: '2026-07-27',
    totalCostYuan: '1',
    units: '10',
  })
}

function createSubmitters(calls: string[], failGroups = false): FundEditSubmitters {
  return {
    updateFundGroupMembership(_code, selectedGroupIds) {
      calls.push(`groups:${[...selectedGroupIds].join(',')}`)
      return failGroups ? { error: '分组失败' } : {}
    },
    updateFundHolding() {
      calls.push('holding')
      return {}
    },
  }
}

function coordinationResult(
  status: PortfolioCoordinationResult['status'],
): PortfolioCoordinationResult {
  return {
    fundCode: '000001',
    holding: null,
    ledger: null,
    ok: status === 'synced',
    partialPersistence: false,
    portfolio: createEmptyPortfolio(),
    retryable: status !== 'synced',
    status,
  }
}
