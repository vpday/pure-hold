import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  PortfolioBuyEvent,
  PortfolioInstallment,
  PortfolioPlan,
} from '@/domains/portfolio/models/index.ts'
import { toPortfolioPlanViewModel } from './toPortfolioPlanViewModel.ts'

const plan: PortfolioPlan = {
  amountCents: 50_000,
  createdAt: '2026-08-01T09:00:00.000Z',
  cycle: 'monthly',
  executionDay: 1,
  executionMode: 'manual',
  fundCode: '000001',
  id: 'plan-1',
  startDate: '2026-08-01',
  status: 'active',
  updatedAt: '2026-08-01T09:00:00.000Z',
}

const installment: PortfolioInstallment = {
  createdAt: '2026-08-01T09:00:00.000Z',
  fundCode: '000001',
  id: 'installment:plan-1:2026-08-01',
  planId: 'plan-1',
  plannedDate: '2026-08-01',
  status: 'pending',
  updatedAt: '2026-08-01T09:00:00.000Z',
}

const buy: PortfolioBuyEvent = {
  auditedAt: '2026-08-01T09:00:00.000Z',
  confirmedDate: '2026-08-01',
  createdAt: '2026-08-01T09:00:00.000Z',
  fundCode: '000001',
  id: 'plan-buy:plan-1:installment:plan-1:2026-08-01',
  installmentId: installment.id,
  kind: 'buy',
  planId: 'plan-1',
  purchaseFee: { confidence: 'actual', source: 'manual', value: 50 },
  purchaseFeeRate: { confidence: 'actual', source: 'manual', value: 1 },
  settlementStatus: 'settled',
  source: 'plan',
  totalAmount: { confidence: 'actual', source: 'manual', value: 50_000 },
  unitNav: { confidence: 'actual', source: 'nav-history', value: 2 },
  units: { confidence: 'actual', source: 'manual', value: 249.75 },
  updatedAt: '2026-08-01T09:00:00.000Z',
}

test('shows a virtual next occurrence without mutating the portfolio', () => {
  const result = toPortfolioPlanViewModel(plan, [], [], '2026-08-14')
  assert.equal(result.amountText, '¥500.00')
  assert.equal(result.nextDateText, '2026-09-01')
  assert.equal(result.nextInstallment?.isVirtual, true)
  assert.equal(result.installmentCount, 0)
})

test('uses the settled associated buy as the source of executed status', () => {
  const result = toPortfolioPlanViewModel(plan, [installment], [buy], '2026-08-14')
  const historical = result.installments.find(({ plannedDate }) => plannedDate === '2026-08-01')
  assert.equal(historical?.statusText, '已执行')
  assert.equal(historical?.detailText, '关联买入已结算')
  assert.equal(result.nextDateText, '2026-09-01')
})

test('describes daily plans as trading-day schedules', () => {
  const result = toPortfolioPlanViewModel(
    { ...plan, cycle: 'daily', executionDay: 1 },
    [],
    [],
    '2026-08-14',
  )
  assert.equal(result.cycleText, '每天（交易日）')
})
