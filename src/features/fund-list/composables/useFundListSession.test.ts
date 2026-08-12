import assert from 'node:assert/strict'
import test from 'node:test'
import { nextTick, ref } from 'vue'

import type { FundGroupDefinition } from '@/domains/funds/models/fundGroupDefinition.ts'
import type { FundHolding } from '@/domains/funds/models/fundHolding.ts'
import type { FundSnapshot } from '@/domains/funds/models/fundSnapshot.ts'
import type { FundRefreshIssue } from '@/domains/funds/services/tiantian/fundRefreshIssue.ts'
import { createTestFundSnapshot } from '@/domains/funds/testing/createTestFundSnapshot.ts'
import { useFundListSession } from './useFundListSession.ts'

test('projects the holdings category through metrics, sorting, dates and refresh notices', () => {
  const state = createState({
    fundOrder: ['a', 'b', 'c'],
    groups: [{ fundCodes: ['c', 'a'], id: 'custom', name: '自定义' }],
    holdingOrder: ['b', 'a'],
    holdingsByCode: {
      a: holding('a', 10, 1),
      b: holding('b', 20, 1),
    },
    issues: [
      { code: 'persistence-failed' },
      { code: 'cache-fallback', fundCode: 'a' },
      { code: 'request-failed', fundCode: 'b' },
    ],
    snapshotsByCode: {
      a: snapshot('a', { estimatedAt: '2026-08-12 14:30', fetchedAt: 1, nav: 2 }),
      b: snapshot('b', { estimatedAt: '2026-08-12 15:00', fetchedAt: null, nav: 1.5 }),
      c: snapshot('c', { nav: 1 }),
    },
  })
  const session = useFundListSession({
    ...state.inputs,
    now: () => new Date('2026-08-12T08:00:00Z'),
  })

  session.selectCategory('holdings')
  session.setSort({ descending: true, sortBy: 'holdingAmount' })

  assert.deepEqual(
    session.model.value.categories.map(({ id }) => id),
    ['all', 'holdings', 'custom'],
  )
  assert.equal(session.model.value.holdingMode, true)
  assert.deepEqual(
    session.model.value.rows.map(({ code }) => code),
    ['b', 'a'],
  )
  assert.equal(session.model.value.rows[0]?.holding?.holdingAmountText, '30.00')
  assert.equal(session.model.value.latestEstimatedAt, '15:00')
  assert.equal(session.model.value.latestNavDate, '08-11')
  assert.deepEqual(session.model.value.refreshNotices, [
    { level: 'warning', message: '刷新成功，但未能保存；刷新页面后可能恢复旧数据' },
    { level: 'warning', message: '网络刷新失败，已显示缓存数据' },
    { level: 'error', message: '部分基金刷新失败' },
  ])
})

test('restores all when a category disappears and keeps sorts isolated by category', async () => {
  const state = createState({
    fundOrder: ['a'],
    groups: [{ fundCodes: ['a'], id: 'custom', name: '自定义' }],
    holdingOrder: ['a'],
    holdingsByCode: { a: holding('a', 10, 1) },
    snapshotsByCode: { a: snapshot('a') },
  })
  const session = useFundListSession(state.inputs)

  session.setSort({ descending: true, sortBy: 'oneYear' })
  session.selectCategory('holdings')
  session.setSort({ descending: false, sortBy: 'holdingAmount' })
  session.selectCategory('all')
  assert.deepEqual(session.model.value.activeSort, { descending: true, sortBy: 'oneYear' })

  session.selectCategory('holdings')
  assert.deepEqual(session.model.value.activeSort, {
    descending: false,
    sortBy: 'holdingAmount',
  })
  session.clearCategorySorts(['holdings'])
  assert.equal(session.model.value.activeSort, null)

  session.selectCategory('custom')
  state.groups.value = []
  await nextTick()
  assert.equal(session.model.value.activeCategory.id, 'all')
  assert.deepEqual(session.model.value.activeSort, { descending: true, sortBy: 'oneYear' })
})

test('skips missing or mismatched snapshots and only builds holding models in holdings', () => {
  const state = createState({
    fundOrder: ['a', 'b', 'c'],
    groups: [{ fundCodes: ['c'], id: 'custom', name: '自定义' }],
    holdingOrder: ['c'],
    holdingsByCode: { c: holding('c', 10, 1) },
    snapshotsByCode: {
      a: snapshot('wrong'),
      c: snapshot('c'),
    },
  })
  const session = useFundListSession(state.inputs)

  assert.deepEqual(
    session.model.value.rows.map(({ code }) => code),
    ['c'],
  )
  assert.equal(session.model.value.rows[0]?.holding, undefined)

  session.selectCategory('custom')
  assert.equal(session.model.value.rows[0]?.holding, undefined)

  session.selectCategory('holdings')
  assert.ok(session.model.value.rows[0]?.holding)
})

test('owns stable ascending and descending null-last sorting', () => {
  const state = createState({
    fundOrder: ['a', 'b', 'c', 'd'],
    snapshotsByCode: {
      a: snapshot('a', { dailyChangePercent: 2 }),
      b: snapshot('b', { dailyChangePercent: null }),
      c: snapshot('c', { dailyChangePercent: 1 }),
      d: snapshot('d', { dailyChangePercent: 2 }),
    },
  })
  const session = useFundListSession(state.inputs)

  session.setSort({ descending: false, sortBy: 'dailyChangePercent' })
  assert.deepEqual(
    session.model.value.rows.map(({ code }) => code),
    ['c', 'a', 'd', 'b'],
  )

  session.setSort({ descending: true, sortBy: 'dailyChangePercent' })
  assert.deepEqual(
    session.model.value.rows.map(({ code }) => code),
    ['a', 'd', 'c', 'b'],
  )
})

test('uses the injected Shanghai date for display and holding days', () => {
  const state = createState({
    fundOrder: ['a'],
    holdingOrder: ['a'],
    holdingsByCode: { a: holding('a', 10, 1, '2026-08-11') },
    snapshotsByCode: {
      a: snapshot('a', { estimatedAt: '2026-08-12 09:30', nav: 2 }),
    },
  })
  const session = useFundListSession({
    ...state.inputs,
    now: () => new Date('2026-08-11T16:30:00Z'),
  })

  session.selectCategory('holdings')
  assert.equal(session.model.value.latestEstimatedAt, '09:30')
  assert.equal(session.model.value.rows[0]?.holding?.holdingDaysText, '1 天')
})

function createState(options: {
  readonly fundOrder?: readonly string[]
  readonly groups?: readonly FundGroupDefinition[]
  readonly holdingOrder?: readonly string[]
  readonly holdingsByCode?: Readonly<Record<string, FundHolding>>
  readonly issues?: readonly FundRefreshIssue[]
  readonly snapshotsByCode?: Readonly<Record<string, FundSnapshot>>
}) {
  const fundOrder = ref(options.fundOrder ?? [])
  const groups = ref(options.groups ?? [])
  const holdingOrder = ref(options.holdingOrder ?? [])
  const holdingsByCode = ref(options.holdingsByCode ?? {})
  const lastRefreshIssues = ref(options.issues ?? [])
  const previousSnapshotsByCode = ref<Readonly<Record<string, FundSnapshot>>>({})
  const snapshotsByCode = ref(options.snapshotsByCode ?? {})
  return {
    groups,
    inputs: {
      fundOrder,
      groups,
      holdingOrder,
      holdingsByCode,
      lastRefreshIssues,
      previousSnapshotsByCode,
      snapshotsByCode,
    },
  }
}

function holding(
  code: string,
  units: number,
  costPrice: number,
  purchaseDate = '2026-08-01',
): FundHolding {
  return { code, costPrice, dividendMode: 'cash', purchaseDate, units }
}

function snapshot(code: string, overrides: Partial<FundSnapshot> = {}): FundSnapshot {
  return {
    ...createTestFundSnapshot(code),
    estimatedAt: '2026-08-12 14:00',
    fetchedAt: 1,
    nav: 1,
    navDate: '2026-08-11',
    ...overrides,
  }
}
