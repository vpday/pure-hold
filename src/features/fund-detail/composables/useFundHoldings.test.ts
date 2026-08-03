import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'

import type { FundHoldingQuote } from '@/domains/funds/models/fundHoldingQuote.ts'
import type { FundHoldingsDisclosure } from '@/domains/funds/models/fundHoldingsDisclosure.ts'
import { useFundHoldings } from './useFundHoldings.ts'

test('opens lazily and first activation loads dates, disclosure and quotes', async () => {
  const calls: string[] = []
  const session = useFundHoldings(ref(true), {
    loadDates: async (code) => {
      calls.push(`dates:${code}`)
      return ['2026-06-30']
    },
    loadDisclosure: async (code, date) => {
      calls.push(`holdings:${code}:${date}`)
      return disclosure(date)
    },
    loadQuotes: async (requests) => {
      calls.push(`quotes:${requests.map(({ code }) => code).join(',')}`)
      return quotes()
    },
  })

  session.open('161725')
  assert.deepEqual(calls, [])
  await session.refresh()
  assert.deepEqual(calls, [])
  await session.activate()
  assert.deepEqual(calls, ['dates:161725', 'holdings:161725:2026-06-30', 'quotes:600519,118034'])
  assert.equal(session.model.value.selectedReportDate, '2026-06-30')
  session.close()
})

test('reuses successful disclosure cache after close but always refreshes quotes', async () => {
  let datesCalls = 0
  let disclosureCalls = 0
  let quoteCalls = 0
  const session = useFundHoldings(ref(true), {
    loadDates: async () => {
      datesCalls += 1
      return ['2026-06-30']
    },
    loadDisclosure: async (_, date) => {
      disclosureCalls += 1
      return disclosure(date)
    },
    loadQuotes: async () => {
      quoteCalls += 1
      return quotes()
    },
  })
  session.open('161725')
  await session.activate()
  session.close()
  session.open('161725')
  await session.activate()
  assert.equal(datesCalls, 1)
  assert.equal(disclosureCalls, 1)
  assert.equal(quoteCalls, 2)
  session.close()
})

test('switches dates, ignores a late old response and requests the selected report quotes', async () => {
  const oldResponse = deferred<FundHoldingsDisclosure>()
  const quoteDates: string[] = []
  const session = useFundHoldings(ref(true), {
    loadDates: async () => ['2026-06-30', '2026-03-31'],
    loadDisclosure: async (_, date) =>
      date === '2026-06-30' ? oldResponse.promise : disclosure(date),
    loadQuotes: async (requests) => {
      quoteDates.push(requests[0]!.code)
      return quotes()
    },
  })
  session.open('161725')
  const activating = session.activate()
  await nextMicrotask()
  await session.selectReportDate('2026-03-31')
  oldResponse.resolve(disclosure('2026-06-30'))
  await activating
  assert.equal(session.model.value.reportDateText, '2026-03-31')
  assert.deepEqual(quoteDates, ['600519'])
  session.close()
})

test('polls only visible positions and avoids overlapping quote requests', async () => {
  const visible = ref(true)
  const timer = fakeTimer()
  const pending = deferred<readonly FundHoldingQuote[]>()
  let quoteCalls = 0
  const session = useFundHoldings(visible, {
    clearInterval: timer.clearInterval,
    loadDates: async () => ['2026-06-30'],
    loadDisclosure: async (_, date) => disclosure(date),
    loadQuotes: async () => {
      quoteCalls += 1
      return quoteCalls === 1 ? quotes() : pending.promise
    },
    setInterval: timer.setInterval,
  })
  session.open('161725')
  await session.activate()
  assert.equal(quoteCalls, 1)
  timer.tick(9_999)
  assert.equal(quoteCalls, 1)
  timer.tick(1)
  timer.tick(10_000)
  assert.equal(quoteCalls, 2)
  pending.resolve(quotes())
  await nextTask()
  session.selectView('allocation')
  timer.tick(20_000)
  assert.equal(quoteCalls, 2)
  session.selectView('positions')
  await nextTask()
  assert.equal(quoteCalls, 3)
  visible.value = false
  await nextMicrotask()
  timer.tick(20_000)
  assert.equal(quoteCalls, 3)
  session.close()
})

test('global refresh selects a new latest report and otherwise keeps a historical selection', async () => {
  let dates = ['2026-06-30', '2026-03-31']
  const session = useFundHoldings(ref(false), {
    loadDates: async () => dates,
    loadDisclosure: async (_, date) => disclosure(date),
    loadQuotes: async () => quotes(),
  })
  session.open('161725')
  await session.activate()
  await session.selectReportDate('2026-03-31')
  await session.refresh()
  assert.equal(session.model.value.selectedReportDate, '2026-03-31')
  dates = ['2026-09-30', ...dates]
  await session.refresh()
  assert.equal(session.model.value.selectedReportDate, '2026-09-30')
  assert.equal(session.model.value.reportDateText, '2026-09-30')
  session.close()
})

test('keeps disclosure on quote failure and clears the warning after retry', async () => {
  let shouldFail = true
  const session = useFundHoldings(ref(true), {
    loadDates: async () => ['2026-06-30'],
    loadDisclosure: async (_, date) => disclosure(date),
    loadQuotes: async () => {
      if (shouldFail) throw new Error('offline')
      return quotes()
    },
  })
  session.open('161725')
  await session.activate()
  assert.equal(session.model.value.stocks.length, 1)
  assert.match(session.model.value.quoteWarning, /实时行情加载失败/)
  shouldFail = false
  await session.retryQuotes()
  assert.equal(session.model.value.quoteWarning, '')
  assert.equal(session.model.value.stocks[0]!.priceText, '1400')
  session.close()
})

function disclosure(reportDate: string): FundHoldingsDisclosure {
  return {
    bonds: [{ code: '118034', market: 'sh', name: '晶能转债', netAssetPercent: 1 }],
    fundCode: '161725',
    reportDate,
    stocks: [
      {
        changePercent: 1,
        changeType: 'increased',
        code: '600519',
        heavyQuarterCount: 2,
        industryName: '食品饮料',
        market: 'sh',
        name: '贵州茅台',
        netAssetPercent: 10,
      },
    ],
  }
}

function quotes(): readonly FundHoldingQuote[] {
  return [
    { code: '600519', dailyChangePercent: 1, latestPrice: 1400, market: 'sh' },
    { code: '118034', dailyChangePercent: -1, latestPrice: 118.8, market: 'sh' },
  ]
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

function nextMicrotask(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve))
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function fakeTimer() {
  type Timer = { callback: () => void; elapsed: number; interval: number }
  const timers = new Map<number, Timer>()
  let nextId = 1
  return {
    clearInterval: (handle: ReturnType<typeof setInterval>) => {
      timers.delete(handle as unknown as number)
    },
    setInterval: (callback: () => void, interval: number) => {
      const id = nextId++
      timers.set(id, { callback, elapsed: 0, interval })
      return id as unknown as ReturnType<typeof setInterval>
    },
    tick: (milliseconds: number) => {
      for (const timer of timers.values()) {
        timer.elapsed += milliseconds
        while (timer.elapsed >= timer.interval) {
          timer.elapsed -= timer.interval
          timer.callback()
        }
      }
    },
  }
}
