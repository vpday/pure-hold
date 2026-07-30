import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { effectScope } from 'vue'

import type { FundSearchPage } from '@/domains/funds/models/fundSearch.ts'
import { useFundSearch } from './useFundSearch.ts'

test('search debounces 300ms, trims input and only requests the latest keyword', async () => {
  const calls: string[] = []
  const scope = effectScope()
  const state = scope.run(() =>
    useFundSearch(new Set(), async (query, pageIndex) => {
      calls.push(`${query}:${pageIndex}`)
      return page([], pageIndex, 0)
    }),
  )!

  state.setKeyword('旧')
  await delay(100)
  state.setKeyword(' 新 ')
  await delay(250)
  assert.deepEqual(calls, [])
  await delay(70)
  assert.deepEqual(calls, ['新:1'])
  scope.stop()
})

test('late responses do not replace newer results and mobile pages append uniquely', async () => {
  const releases = new Map<string, (page: FundSearchPage) => void>()
  const scope = effectScope()
  const state = scope.run(() =>
    useFundSearch(
      new Set(),
      (query, pageIndex) =>
        new Promise((resolve) => releases.set(`${query}:${pageIndex}`, resolve)),
    ),
  )!

  state.setKeyword('旧')
  await delay(310)
  state.setKeyword('新')
  await delay(310)
  releases.get('新:1')?.(page([{ code: '000001', name: '新基金' }], 1, 40))
  await delay(0)
  releases.get('旧:1')?.(page([{ code: '000009', name: '旧基金' }], 1, 1))
  await delay(0)
  assert.deepEqual(state.items.value, [{ code: '000001', name: '新基金' }])

  state.loadMore()
  releases.get('新:2')?.(
    page(
      [
        { code: '000001', name: '重复' },
        { code: '000002', name: '下一页' },
      ],
      2,
      40,
    ),
  )
  await delay(0)
  assert.deepEqual(
    state.items.value.map(({ code }) => code),
    ['000001', '000002'],
  )
  scope.stop()
})

test('selection persists across searches, existing funds are disabled and reset clears state', () => {
  const scope = effectScope()
  const state = scope.run(() => useFundSearch(new Set(['000001'])))!
  state.toggleSelection({ code: '000001', name: '已有' })
  state.toggleSelection({ code: '000002', name: '新增' })
  assert.deepEqual(
    state.selected.value.map(({ code }) => code),
    ['000002'],
  )
  assert.equal(state.selectedExpanded.value, false)
  state.selectedExpanded.value = true
  state.setKeyword('另一关键词')
  assert.deepEqual(
    state.selected.value.map(({ code }) => code),
    ['000002'],
  )
  state.reset()
  assert.equal(state.keyword.value, '')
  assert.deepEqual(state.selected.value, [])
  assert.equal(state.selectedExpanded.value, false)
  scope.stop()
})

function page(
  items: FundSearchPage['items'],
  pageIndex: number,
  totalCount: number,
): FundSearchPage {
  return { items, pageIndex, pageSize: 20, totalCount }
}
